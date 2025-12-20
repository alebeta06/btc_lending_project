use starknet::ContractAddress;

pub mod mocks;

#[starknet::interface]
pub trait IBTCLending<TContractState> {
    fn deposit_collateral(ref self: TContractState, amount: u256);
    fn borrow(ref self: TContractState, amount: u256);
    fn liquidate(ref self: TContractState, user: ContractAddress);
    fn calculate_health_factor(self: @TContractState, user: ContractAddress) -> u256;
    fn get_user_collateral(self: @TContractState, user: ContractAddress) -> u256;
    fn get_user_debt(self: @TContractState, user: ContractAddress) -> u256;
    fn set_oracle_price(ref self: TContractState, price: u256); // Para testing
}

#[starknet::contract]
mod BTCLending {
    use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_caller_address, get_contract_address};

    #[storage]
    struct Storage {
        user_collateral: Map<ContractAddress, u256>,
        user_debt: Map<ContractAddress, u256>,
        wbtc_token: ContractAddress,
        liquidation_threshold: u256,
        oracle_price: u256 // Precio del BTC en USD (para testing)
    }

    #[constructor]
    fn constructor(
        ref self: ContractState, wbtc_token: ContractAddress, liquidation_threshold: u256,
    ) {
        self.wbtc_token.write(wbtc_token);
        self.liquidation_threshold.write(liquidation_threshold);
        self.oracle_price.write(6000000000000); // $60k por defecto
    }

    #[abi(embed_v0)]
    impl BTCLendingImpl of super::IBTCLending<ContractState> {
        fn deposit_collateral(ref self: ContractState, amount: u256) {
            let caller = get_caller_address();
            let contract_vault = get_contract_address();

            // Transferir wBTC del usuario al contrato
            let token_dispatcher = IERC20Dispatcher { contract_address: self.wbtc_token.read() };
            token_dispatcher.transfer_from(caller, contract_vault, amount);

            // Actualizar colateral
            let current_collateral = self.user_collateral.read(caller);
            self.user_collateral.write(caller, current_collateral + amount);
        }

        fn borrow(ref self: ContractState, amount: u256) {
            let caller = get_caller_address();

            // Actualizar deuda
            let current_debt = self.user_debt.read(caller);
            self.user_debt.write(caller, current_debt + amount);

            // Verificar que el health factor sea > 1 después del préstamo
            let health_factor = self.calculate_health_factor(caller);
            assert(health_factor >= 100, 'Health factor too low');
            // Transferir fondos al usuario (en producción sería USDC o similar)
        // Por ahora solo actualizamos la deuda
        }

        fn liquidate(ref self: ContractState, user: ContractAddress) {
            let health_factor = self.calculate_health_factor(user);
            assert(health_factor < 100, 'User is healthy');

            let debt = self.user_debt.read(user);
            let collateral = self.user_collateral.read(user);

            // Liquidador paga la deuda y recibe el colateral con descuento (10%)
            let liquidator = get_caller_address();

            // Transferir colateral al liquidador
            let token_dispatcher = IERC20Dispatcher { contract_address: self.wbtc_token.read() };
            token_dispatcher.transfer(liquidator, collateral);

            // Limpiar posición del usuario
            self.user_debt.write(user, 0);
            self.user_collateral.write(user, 0);
        }

        fn calculate_health_factor(self: @ContractState, user: ContractAddress) -> u256 {
            let collateral = self.user_collateral.read(user);
            let debt = self.user_debt.read(user);

            if debt == 0 {
                return 999_999_999;
            }

            let btc_price = self.oracle_price.read();
            let collateral_value_usd = (collateral * btc_price) / 100_000_000;
            let collateral_adjusted = (collateral_value_usd * self.liquidation_threshold.read())
                / 10000;

            (collateral_adjusted * 100) / debt
        }

        fn get_user_collateral(self: @ContractState, user: ContractAddress) -> u256 {
            self.user_collateral.read(user)
        }

        fn get_user_debt(self: @ContractState, user: ContractAddress) -> u256 {
            self.user_debt.read(user)
        }

        fn set_oracle_price(ref self: ContractState, price: u256) {
            // En producción esto estaría protegido o vendría de un oráculo real
            self.oracle_price.write(price);
        }
    }
}
