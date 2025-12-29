// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts for Cairo ^0.20.0

#[starknet::contract]
mod MockUSD {
    use openzeppelin_token::erc20::{ERC20Component, ERC20HooksEmptyImpl};
    use starknet::ContractAddress;

    component!(path: ERC20Component, storage: erc20, event: ERC20Event);

    // ERC20 Mixin
    #[abi(embed_v0)]
    impl ERC20MixinImpl = ERC20Component::ERC20MixinImpl<ContractState>;
    impl ERC20InternalImpl = ERC20Component::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        erc20: ERC20Component::Storage,
        lending_contract: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        ERC20Event: ERC20Component::Event,
    }

    #[constructor]
    fn constructor(ref self: ContractState, lending_contract: ContractAddress) {
        self.erc20.initializer("Mock USD", "mUSD");
        self.lending_contract.write(lending_contract);
    }

    #[generate_trait]
    #[abi(per_item)]
    impl ExternalImpl of ExternalTrait {
        /// Mint new tokens - Only callable by lending contract
        #[external(v0)]
        fn mint(ref self: ContractState, to: ContractAddress, amount: u256) {
            // Only lending contract can mint
            let caller = starknet::get_caller_address();
            assert(caller == self.lending_contract.read(), 'Only lending can mint');

            self.erc20.mint(to, amount);
        }

        /// Burn tokens - Only callable by lending contract
        #[external(v0)]
        fn burn(ref self: ContractState, from: ContractAddress, amount: u256) {
            // Only lending contract can burn
            let caller = starknet::get_caller_address();
            assert(caller == self.lending_contract.read(), 'Only lending can burn');

            self.erc20.burn(from, amount);
        }

        /// Update lending contract address (for redeployments)
        #[external(v0)]
        fn set_lending_contract(ref self: ContractState, new_lending: ContractAddress) {
            // In production, add access control here
            self.lending_contract.write(new_lending);
        }

        /// Get lending contract address
        #[external(v0)]
        fn get_lending_contract(self: @ContractState) -> ContractAddress {
            self.lending_contract.read()
        }
    }
}
