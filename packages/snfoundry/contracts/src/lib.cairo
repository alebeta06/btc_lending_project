// ============================================
// CONTRATO DE LENDING BTCFi
// ============================================
// Este contrato permite a los usuarios depositar Bitcoin (wBTC) como colateral
// y pedir prestado contra ese colateral. Incluye liquidaciones automáticas.

use starknet::ContractAddress;

pub mod mocks;

// ============================================
// INTERFAZ PÚBLICA DEL CONTRATO
// ============================================
// Define todas las funciones que pueden ser llamadas externamente

#[starknet::interface]
pub trait IBTCLending<TContractState> {
    // Depositar wBTC como colateral
    // @param amount: Cantidad en wBTC (8 decimales, ej: 100_000_000 = 1 BTC)
    fn deposit_collateral(ref self: TContractState, amount: u256);

    // Pedir prestado contra el colateral
    // @param amount: Cantidad en USD a pedir prestado
    fn borrow(ref self: TContractState, amount: u256);

    // Liquidar a un usuario si su Health Factor < 100
    // @param user: Dirección del usuario a liquidar
    fn liquidate(ref self: TContractState, user: ContractAddress);

    // Calcular el Health Factor de un usuario
    // @return: HF × 100 (ej: 160 significa HF = 1.6)
    fn calculate_health_factor(self: @TContractState, user: ContractAddress) -> u256;

    // Obtener el colateral depositado por un usuario
    fn get_user_collateral(self: @TContractState, user: ContractAddress) -> u256;

    // Obtener la deuda de un usuario
    fn get_user_debt(self: @TContractState, user: ContractAddress) -> u256;

    // Pagar deuda (total o parcial)
    // @param amount: Cantidad en USD a pagar
    fn repay(ref self: TContractState, amount: u256);

    // Retirar colateral
    // @param amount: Cantidad en wBTC a retirar
    fn withdraw_collateral(ref self: TContractState, amount: u256);

    // Obtener precio actual del oráculo
    fn get_oracle_price(self: @TContractState) -> u256;

    // Obtener total de depósitos del protocolo
    fn get_total_deposits(self: @TContractState) -> u256;

    // Obtener total prestado del protocolo
    fn get_total_borrowed(self: @TContractState) -> u256;

    // Obtener número de usuarios activos
    fn get_active_users_count(self: @TContractState) -> u256;

    // Actualizar precio del oráculo (solo para testing)
    fn set_oracle_price(ref self: TContractState, price: u256);
}

// ============================================
// PRAGMA ORACLE INTERFACE
// ============================================
// Interfaz para interactuar con Pragma Oracle

#[derive(Drop, Copy, Serde)]
struct PragmaPricesResponse {
    price: u128,
    decimals: u32,
    last_updated_timestamp: u64,
    num_sources_aggregated: u32,
    expiration_timestamp: Option<u64>,
}

#[starknet::interface]
trait IPragmaABI<TContractState> {
    fn get_data_median(self: @TContractState, data_type: DataType) -> PragmaPricesResponse;
}

#[derive(Drop, Copy, Serde)]
enum DataType {
    SpotEntry: felt252,
    FutureEntry: (felt252, u64),
    GenericEntry: felt252,
}

#[starknet::contract]
mod BTCLending {
    use openzeppelin_token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_caller_address, get_contract_address};
    use super::{DataType, IPragmaABIDispatcher, IPragmaABIDispatcherTrait};

    // ============================================
    // STORAGE - Almacenamiento Permanente
    // ============================================
    // Todas estas variables se guardan en la blockchain

    #[storage]
    struct Storage {
        // Map: Diccionario que asocia dirección → cantidad
        user_collateral: Map<ContractAddress, u256>, // Colateral de cada usuario
        user_debt: Map<ContractAddress, u256>, // Deuda de cada usuario
        wbtc_token: ContractAddress, // Dirección del token wBTC
        usd_token: ContractAddress, // Dirección del token MockUSD (para mintear/quemar)
        liquidation_threshold: u256, // Umbral (8000 = 80%)
        oracle_price: u256, // Precio BTC en USD (fallback si oracle falla)
        pragma_oracle: ContractAddress, // Dirección del Pragma Oracle
        // Estadísticas globales del protocolo
        total_deposits: u256, // Total wBTC depositado por todos los usuarios
        total_borrowed: u256, // Total USD prestado por todos los usuarios
        active_users: u256 // Número de usuarios con posiciones activas
    }

    // ============================================
    // CONSTRUCTOR
    // ============================================
    // Se ejecuta UNA SOLA VEZ al desplegar el contrato

    #[constructor]
    fn constructor(
        ref self: ContractState,
        wbtc_token: ContractAddress, // Dirección del token wBTC
        usd_token: ContractAddress, // Dirección del token MockUSD
        liquidation_threshold: u256, // Ej: 8000 = 80%
        pragma_oracle: ContractAddress // Dirección del Pragma Oracle
    ) {
        self.wbtc_token.write(wbtc_token);
        self.usd_token.write(usd_token);
        self.liquidation_threshold.write(liquidation_threshold);
        self.pragma_oracle.write(pragma_oracle);
        self.oracle_price.write(10000000000000000); // Precio fallback: $100,000
    }

    #[abi(embed_v0)]
    impl BTCLendingImpl of super::IBTCLending<ContractState> {
        // ============================================
        // DEPOSITAR COLATERAL
        // ============================================
        fn deposit_collateral(ref self: ContractState, amount: u256) {
            // 1. Obtener quién está llamando la función
            let caller = get_caller_address();
            let contract_vault = get_contract_address();

            // 2. Transferir wBTC del usuario a este contrato
            // NOTA: El usuario debe haber hecho approve() antes
            let token_dispatcher = IERC20Dispatcher { contract_address: self.wbtc_token.read() };
            token_dispatcher.transfer_from(caller, contract_vault, amount);

            // 3. Actualizar el colateral del usuario en el storage
            let current_collateral = self.user_collateral.read(caller);
            self.user_collateral.write(caller, current_collateral + amount);

            // 4. Actualizar estadísticas globales
            let total = self.total_deposits.read();
            self.total_deposits.write(total + amount);

            // Si es el primer depósito del usuario, incrementar active_users
            if current_collateral == 0 {
                let users = self.active_users.read();
                self.active_users.write(users + 1);
            }
        }

        // ============================================
        // PEDIR PRESTADO (CDP Model)
        // ============================================
        fn borrow(ref self: ContractState, amount: u256) {
            let caller = get_caller_address();

            // 1. Actualizar la deuda del usuario
            let current_debt = self.user_debt.read(caller);
            self.user_debt.write(caller, current_debt + amount);

            // 2. Verificar que el Health Factor sea >= 100
            // Si es menor, la transacción se revierte
            let health_factor = self.calculate_health_factor(caller);
            assert(health_factor >= 100, 'Health factor too low');

            // 3. MINTEAR MockUSD al usuario (CDP Model)
            // El protocolo crea nuevos tokens USD
            let usd_dispatcher = IERC20Dispatcher { contract_address: self.usd_token.read() };
            // Nota: Necesitamos una interfaz especial para mint
            // Por ahora, MockUSD debe permitir que BTCLending mintee

            // 4. Actualizar total_borrowed global
            let total = self.total_borrowed.read();
            self.total_borrowed.write(total + amount);
            // NOTA: El minteo real se hace en MockUSD.mint(caller, amount)
        // El contrato MockUSD debe tener una función mint() que solo BTCLending puede llamar
        }

        // ============================================
        // PAGAR DEUDA (CDP Model)
        // ============================================
        fn repay(ref self: ContractState, amount: u256) {
            let caller = get_caller_address();
            let current_debt = self.user_debt.read(caller);

            // Validar que la cantidad no exceda la deuda
            assert(amount <= current_debt, 'Amount exceeds debt');
            assert(amount > 0, 'Amount must be positive');

            // 1. QUEMAR MockUSD del usuario (CDP Model)
            // El usuario devuelve los tokens y se destruyen
            let usd_dispatcher = IERC20Dispatcher { contract_address: self.usd_token.read() };
            // Nota: Necesitamos una interfaz especial para burn
            // Por ahora, MockUSD debe permitir que BTCLending queme tokens del usuario

            // 2. Actualizar deuda del usuario
            self.user_debt.write(caller, current_debt - amount);

            // 3. Actualizar total_borrowed global
            let total = self.total_borrowed.read();
            self.total_borrowed.write(total - amount);
            // NOTA: El quemado real se hace en MockUSD.burn(caller, amount)
        // El contrato MockUSD debe tener una función burn() que solo BTCLending puede llamar
        }

        // ============================================
        // RETIRAR COLATERAL
        // ============================================
        fn withdraw_collateral(ref self: ContractState, amount: u256) {
            let caller = get_caller_address();
            let current_collateral = self.user_collateral.read(caller);

            // Validar que tenga suficiente colateral
            assert(amount <= current_collateral, 'Insufficient collateral');
            assert(amount > 0, 'Amount must be positive');

            // Calcular nuevo colateral después del retiro
            let new_collateral = current_collateral - amount;

            // Si el usuario tiene deuda, validar que el Health Factor permanezca >= 100
            let debt = self.user_debt.read(caller);
            if debt > 0 {
                // Temporalmente actualizar colateral para calcular nuevo HF
                self.user_collateral.write(caller, new_collateral);
                let health_factor = self.calculate_health_factor(caller);

                // Revertir si HF sería muy bajo
                assert(health_factor >= 100, 'Health factor too low');
            } else {
                // Sin deuda, puede retirar libremente
                self.user_collateral.write(caller, new_collateral);
            }

            // Transferir wBTC al usuario
            let token_dispatcher = IERC20Dispatcher { contract_address: self.wbtc_token.read() };
            token_dispatcher.transfer(caller, amount);

            // Actualizar total_deposits global
            let total = self.total_deposits.read();
            self.total_deposits.write(total - amount);

            // Si retiró todo y no tiene deuda, decrementar active_users
            if new_collateral == 0 && debt == 0 {
                let users = self.active_users.read();
                if users > 0 {
                    self.active_users.write(users - 1);
                }
            }
        }

        // ============================================
        // LIQUIDAR
        // ============================================
        fn liquidate(ref self: ContractState, user: ContractAddress) {
            // 1. Verificar que el usuario esté liquidable (HF < 100)
            let health_factor = self.calculate_health_factor(user);
            assert(health_factor < 100, 'User is healthy');

            // 2. Obtener datos del usuario
            let debt = self.user_debt.read(user);
            let collateral = self.user_collateral.read(user);

            let liquidator = get_caller_address();

            // 3. Transferir el colateral al liquidador
            let token_dispatcher = IERC20Dispatcher { contract_address: self.wbtc_token.read() };
            token_dispatcher.transfer(liquidator, collateral);

            // 4. Limpiar la posición del usuario
            self.user_debt.write(user, 0);
            self.user_collateral.write(user, 0);

            // 5. Actualizar estadísticas globales
            let total_deposits = self.total_deposits.read();
            self.total_deposits.write(total_deposits - collateral);

            let total_borrowed = self.total_borrowed.read();
            self.total_borrowed.write(total_borrowed - debt);

            let users = self.active_users.read();
            if users > 0 {
                self.active_users.write(users - 1);
            }
        }

        // ============================================
        // CALCULAR HEALTH FACTOR
        // ============================================
        // Fórmula: (Colateral en USD × 80% × 100) / Deuda

        fn calculate_health_factor(self: @ContractState, user: ContractAddress) -> u256 {
            let collateral = self.user_collateral.read(user);
            let debt = self.user_debt.read(user);

            // Si no hay deuda, retornar un número muy alto (infinito)
            if debt == 0 {
                return 999_999_999;
            }

            // 1. Obtener precio de BTC
            let btc_price = self.oracle_price.read();

            // 2. Convertir colateral BTC a USD
            // Dividimos entre 10^8 porque BTC tiene 8 decimales
            let collateral_value_usd = (collateral * btc_price) / 100_000_000;

            // 3. Aplicar umbral de liquidación (80%)
            let collateral_adjusted = (collateral_value_usd * self.liquidation_threshold.read())
                / 10000;

            // 4. Calcular HF (multiplicamos por 100 para evitar decimales)
            (collateral_adjusted * 100) / debt
        }

        // ============================================
        // GETTERS - Funciones de Solo Lectura
        // ============================================

        fn get_user_collateral(self: @ContractState, user: ContractAddress) -> u256 {
            self.user_collateral.read(user)
        }

        fn get_user_debt(self: @ContractState, user: ContractAddress) -> u256 {
            self.user_debt.read(user)
        }

        // ============================================
        // GETTERS GLOBALES - Estadísticas del Protocolo
        // ============================================

        fn get_oracle_price(self: @ContractState) -> u256 {
            // Intentar obtener precio de Pragma Oracle
            let pragma_address = self.pragma_oracle.read();

            // Si pragma_oracle es 0x0, usar precio fallback
            let zero_address: ContractAddress = 0.try_into().unwrap();
            if pragma_address == zero_address {
                return self.oracle_price.read();
            }

            // Consultar Pragma Oracle
            let pragma_dispatcher = super::IPragmaABIDispatcher {
                contract_address: pragma_address,
            };

            // BTC/USD pair ID
            let btc_usd_pair: felt252 = 'BTC/USD';
            let data_type = super::DataType::SpotEntry(btc_usd_pair);

            // Obtener precio median
            let response = pragma_dispatcher.get_data_median(data_type);

            // Pragma devuelve precio con 8 decimales
            // Convertir a 13 decimales para consistencia (nuestro estándar USD)
            // response.price es u128, convertir a u256
            let price_u256: u256 = response.price.into();
            let price_adjusted = price_u256 * 100000; // 8 decimals -> 13 decimals

            price_adjusted
        }

        fn get_total_deposits(self: @ContractState) -> u256 {
            self.total_deposits.read()
        }

        fn get_total_borrowed(self: @ContractState) -> u256 {
            self.total_borrowed.read()
        }

        fn get_active_users_count(self: @ContractState) -> u256 {
            self.active_users.read()
        }

        // ============================================
        // ACTUALIZAR PRECIO (Solo para Testing)
        // ============================================

        fn set_oracle_price(ref self: ContractState, price: u256) {
            // En producción esto vendría de Pragma Oracle
            self.oracle_price.write(price);
        }
    }
}
