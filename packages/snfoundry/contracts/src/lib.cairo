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

    // Actualizar precio del oráculo (solo para testing)
    fn set_oracle_price(ref self: TContractState, price: u256);
}

#[starknet::contract]
mod BTCLending {
    use openzeppelin_token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_caller_address, get_contract_address};

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
        liquidation_threshold: u256, // Umbral (8000 = 80%)
        oracle_price: u256 // Precio BTC en USD
    }

    // ============================================
    // CONSTRUCTOR
    // ============================================
    // Se ejecuta UNA SOLA VEZ al desplegar el contrato

    #[constructor]
    fn constructor(
        ref self: ContractState,
        wbtc_token: ContractAddress, // Dirección del token wBTC
        liquidation_threshold: u256 // Ej: 8000 = 80%
    ) {
        self.wbtc_token.write(wbtc_token);
        self.liquidation_threshold.write(liquidation_threshold);
        self.oracle_price.write(6000000000000); // Precio inicial: $60,000
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
        }

        // ============================================
        // PEDIR PRESTADO
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
            // NOTA: En producción, aquí transferirías stablecoins al usuario
        // Por ahora solo actualizamos la deuda
        }

        // ============================================
        // LIQUIDAR
        // ============================================
        fn liquidate(ref self: ContractState, user: ContractAddress) {
            // 1. Verificar que el usuario esté liquidable (HF < 100)
            let health_factor = self.calculate_health_factor(user);
            assert(health_factor < 100, 'User is healthy');

            // 2. Obtener datos del usuario
            let _debt = self.user_debt.read(user);
            let collateral = self.user_collateral.read(user);

            let liquidator = get_caller_address();

            // 3. Transferir el colateral al liquidador
            let token_dispatcher = IERC20Dispatcher { contract_address: self.wbtc_token.read() };
            token_dispatcher.transfer(liquidator, collateral);

            // 4. Limpiar la posición del usuario
            self.user_debt.write(user, 0);
            self.user_collateral.write(user, 0);
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
        // ACTUALIZAR PRECIO (Solo para Testing)
        // ============================================

        fn set_oracle_price(ref self: ContractState, price: u256) {
            // En producción esto vendría de Pragma Oracle
            self.oracle_price.write(price);
        }
    }
}
