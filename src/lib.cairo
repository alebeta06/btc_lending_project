use starknet::ContractAddress;

#[starknet::interface]
pub trait IBTCLending<TContractState> {
    fn deposit_collateral(ref self: TContractState, amount: u256);
    fn calculate_health_factor(self: @TContractState, user: ContractAddress) -> u256;
    fn get_user_collateral(self: @TContractState, user: ContractAddress) -> u256;
}

#[starknet::contract]
mod BTCLending {
    use starknet::{ContractAddress, get_caller_address, get_contract_address};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess, StorageMapReadAccess, StorageMapWriteAccess, Map};
    use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};

    #[storage]
    struct Storage {
        user_collateral: Map<ContractAddress, u256>,
        user_debt: Map<ContractAddress, u256>,
        wbtc_token: ContractAddress,
        liquidation_threshold: u256,
    }

    #[constructor]
    fn constructor(ref self: ContractState, wbtc_token: ContractAddress, liquidation_threshold: u256) {
        self.wbtc_token.write(wbtc_token);
        self.liquidation_threshold.write(liquidation_threshold);
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

        fn calculate_health_factor(self: @ContractState, user: ContractAddress) -> u256 {
            let collateral = self.user_collateral.read(user);
            let debt = self.user_debt.read(user);

            if debt == 0 {
                return 999_999_999;
            }

            let btc_price = self.get_oracle_price();
            let collateral_value_usd = (collateral * btc_price) / 100_000_000;
            let collateral_adjusted = (collateral_value_usd * self.liquidation_threshold.read()) / 10000;

            (collateral_adjusted * 100) / debt
        }

        fn get_user_collateral(self: @ContractState, user: ContractAddress) -> u256 {
            self.user_collateral.read(user)
        }
    }

    #[generate_trait]
    impl InternalFunctions of InternalFunctionsTrait {
        fn get_oracle_price(self: @ContractState) -> u256 {
            6000000000000 // Simulando $60k
        }
    }
}
