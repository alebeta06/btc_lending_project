// ============================================
// MOCK USD - Token USD de Prueba
// ============================================
// Este contrato simula un stablecoin USD para el protocolo de lending
// Implementa el estándar ERC20 con funciones de mint/burn

use starknet::ContractAddress;

// ============================================
// INTERFAZ DEL TOKEN ERC20
// ============================================

#[starknet::interface]
pub trait IERC20MockUSD<TContractState> {
    // Transferir tokens a otro usuario
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;

    // Transferir tokens de un usuario a otro (requiere aprobación)
    fn transfer_from(
        ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256,
    ) -> bool;

    // Aprobar a otro usuario para gastar tus tokens
    fn approve(ref self: TContractState, spender: ContractAddress, amount: u256) -> bool;

    // Ver el balance de un usuario
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;

    // Ver cuánto puede gastar un usuario en nombre de otro
    fn allowance(self: @TContractState, owner: ContractAddress, spender: ContractAddress) -> u256;

    // Crear tokens (solo lending contract)
    fn mint(ref self: TContractState, to: ContractAddress, amount: u256);

    // Quemar tokens (solo lending contract)
    fn burn(ref self: TContractState, from: ContractAddress, amount: u256);

    // Actualizar lending contract
    fn set_lending_contract(ref self: TContractState, new_lending: ContractAddress);

    // Obtener lending contract
    fn get_lending_contract(self: @TContractState) -> ContractAddress;

    // Obtener el nombre del token
    fn name(self: @TContractState) -> ByteArray;

    // Obtener el símbolo del token
    fn symbol(self: @TContractState) -> ByteArray;

    // Obtener los decimales del token
    fn decimals(self: @TContractState) -> u8;
}

#[starknet::contract]
mod MockUSD {
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_caller_address};

    // ============================================
    // STORAGE
    // ============================================

    #[storage]
    struct Storage {
        balances: Map<ContractAddress, u256>, // Balance de cada usuario
        allowances: Map<(ContractAddress, ContractAddress), u256>, // Aprobaciones
        total_supply: u256, // Supply total
        lending_contract: ContractAddress // Contrato de lending autorizado
    }

    // ============================================
    // EVENTOS
    // ============================================

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Transfer: Transfer,
        Approval: Approval,
    }

    #[derive(Drop, starknet::Event)]
    struct Transfer {
        from: ContractAddress,
        to: ContractAddress,
        value: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct Approval {
        owner: ContractAddress,
        spender: ContractAddress,
        value: u256,
    }

    // ============================================
    // CONSTRUCTOR
    // ============================================

    #[constructor]
    fn constructor(ref self: ContractState, lending_contract: ContractAddress) {
        self.lending_contract.write(lending_contract);
    }

    // ============================================
    // IMPLEMENTACIÓN ERC20
    // ============================================

    #[abi(embed_v0)]
    impl ERC20MockUSDImpl of super::IERC20MockUSD<ContractState> {
        fn transfer(ref self: ContractState, recipient: ContractAddress, amount: u256) -> bool {
            let sender = get_caller_address();
            self._transfer(sender, recipient, amount);
            true
        }

        fn transfer_from(
            ref self: ContractState,
            sender: ContractAddress,
            recipient: ContractAddress,
            amount: u256,
        ) -> bool {
            let caller = get_caller_address();

            // Verificar allowance
            let current_allowance = self.allowances.read((sender, caller));
            assert(current_allowance >= amount, 'Insufficient allowance');

            // Reducir allowance
            self.allowances.write((sender, caller), current_allowance - amount);

            // Transferir
            self._transfer(sender, recipient, amount);
            true
        }

        fn approve(ref self: ContractState, spender: ContractAddress, amount: u256) -> bool {
            let owner = get_caller_address();
            self.allowances.write((owner, spender), amount);

            self.emit(Approval { owner, spender, value: amount });
            true
        }

        fn balance_of(self: @ContractState, account: ContractAddress) -> u256 {
            self.balances.read(account)
        }

        fn allowance(
            self: @ContractState, owner: ContractAddress, spender: ContractAddress,
        ) -> u256 {
            self.allowances.read((owner, spender))
        }

        // ============================================
        // MINT - Solo lending contract
        // ============================================
        fn mint(ref self: ContractState, to: ContractAddress, amount: u256) {
            let caller = get_caller_address();
            assert(caller == self.lending_contract.read(), 'Only lending can mint');

            // Aumentar balance
            let current_balance = self.balances.read(to);
            self.balances.write(to, current_balance + amount);

            // Aumentar supply
            let current_supply = self.total_supply.read();
            self.total_supply.write(current_supply + amount);

            // Emitir evento
            let zero_address = starknet::contract_address_const::<0>();
            self.emit(Transfer { from: zero_address, to, value: amount });
        }

        // ============================================
        // BURN - Solo lending contract
        // ============================================
        fn burn(ref self: ContractState, from: ContractAddress, amount: u256) {
            let caller = get_caller_address();
            assert(caller == self.lending_contract.read(), 'Only lending can burn');

            // Verificar balance
            let current_balance = self.balances.read(from);
            assert(current_balance >= amount, 'Insufficient balance');

            // Reducir balance
            self.balances.write(from, current_balance - amount);

            // Reducir supply
            let current_supply = self.total_supply.read();
            self.total_supply.write(current_supply - amount);

            // Emitir evento
            let zero_address = starknet::contract_address_const::<0>();
            self.emit(Transfer { from, to: zero_address, value: amount });
        }

        // ============================================
        // ADMIN FUNCTIONS
        // ============================================
        fn set_lending_contract(ref self: ContractState, new_lending: ContractAddress) {
            // En producción, agregar control de acceso aquí
            self.lending_contract.write(new_lending);
        }

        fn get_lending_contract(self: @ContractState) -> ContractAddress {
            self.lending_contract.read()
        }

        // ============================================
        // METADATA
        // ============================================
        fn name(self: @ContractState) -> ByteArray {
            "Mock USD"
        }

        fn symbol(self: @ContractState) -> ByteArray {
            "mUSD"
        }

        fn decimals(self: @ContractState) -> u8 {
            13_u8 // USD usa 13 decimales en nuestro sistema
        }
    }

    // ============================================
    // FUNCIONES INTERNAS
    // ============================================

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _transfer(
            ref self: ContractState,
            sender: ContractAddress,
            recipient: ContractAddress,
            amount: u256,
        ) {
            // Verificar balance
            let sender_balance = self.balances.read(sender);
            assert(sender_balance >= amount, 'Insufficient balance');

            // Reducir balance del sender
            self.balances.write(sender, sender_balance - amount);

            // Aumentar balance del recipient
            let recipient_balance = self.balances.read(recipient);
            self.balances.write(recipient, recipient_balance + amount);

            // Emitir evento
            self.emit(Transfer { from: sender, to: recipient, value: amount });
        }
    }
}
