// ============================================
// MOCK ERC20 - Token wBTC de Prueba
// ============================================
// Este contrato simula un token wBTC (Wrapped Bitcoin) para testing
// Implementa el estándar ERC20 con funciones adicionales para pruebas

use starknet::ContractAddress;

// ============================================
// INTERFAZ DEL TOKEN ERC20
// ============================================

#[starknet::interface]
pub trait IERC20Mock<TContractState> {
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

    // Crear tokens de la nada (solo para testing)
    fn mint(ref self: TContractState, to: ContractAddress, amount: u256);

    // Obtener el nombre del token
    fn name(self: @TContractState) -> ByteArray;

    // Obtener el símbolo del token
    fn symbol(self: @TContractState) -> ByteArray;

    // Obtener los decimales del token
    fn decimals(self: @TContractState) -> u8;
}

#[starknet::contract]
mod MockWBTC {
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
        total_supply: u256 // Supply total
    }

    // ============================================
    // EVENTOS
    // ============================================
    // Los eventos se emiten cuando ocurren acciones importantes

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
    // IMPLEMENTACIÓN ERC20
    // ============================================

    #[abi(embed_v0)]
    impl ERC20MockImpl of super::IERC20Mock<ContractState> {
        // ============================================
        // TRANSFER - Transferir tokens
        // ============================================
        fn transfer(ref self: ContractState, recipient: ContractAddress, amount: u256) -> bool {
            let sender = get_caller_address();
            self._transfer(sender, recipient, amount);
            true
        }

        // ============================================
        // TRANSFER_FROM - Transferir tokens de otro usuario
        // ============================================
        // Requiere que el owner haya hecho approve() antes

        fn transfer_from(
            ref self: ContractState,
            sender: ContractAddress,
            recipient: ContractAddress,
            amount: u256,
        ) -> bool {
            let caller = get_caller_address();

            // 1. Verificar que el caller tenga permiso (allowance)
            let current_allowance = self.allowances.read((sender, caller));
            assert(current_allowance >= amount, 'Insufficient allowance');

            // 2. Reducir el allowance
            self.allowances.write((sender, caller), current_allowance - amount);

            // 3. Hacer la transferencia
            self._transfer(sender, recipient, amount);
            true
        }

        // ============================================
        // APPROVE - Aprobar a otro usuario
        // ============================================
        // Permite que 'spender' gaste 'amount' tokens en tu nombre

        fn approve(ref self: ContractState, spender: ContractAddress, amount: u256) -> bool {
            let owner = get_caller_address();
            self.allowances.write((owner, spender), amount);

            self.emit(Approval { owner, spender, value: amount });
            true
        }

        // ============================================
        // BALANCE_OF - Ver balance
        // ============================================

        fn balance_of(self: @ContractState, account: ContractAddress) -> u256 {
            self.balances.read(account)
        }

        // ============================================
        // ALLOWANCE - Ver aprobación
        // ============================================

        fn allowance(
            self: @ContractState, owner: ContractAddress, spender: ContractAddress,
        ) -> u256 {
            self.allowances.read((owner, spender))
        }

        // ============================================
        // MINT - Crear tokens (Solo para Testing)
        // ============================================
        // Crea tokens de la nada y los asigna a un usuario

        fn mint(ref self: ContractState, to: ContractAddress, amount: u256) {
            // 1. Aumentar el balance del usuario
            let current_balance = self.balances.read(to);
            self.balances.write(to, current_balance + amount);

            // 2. Aumentar el supply total
            let current_supply = self.total_supply.read();
            self.total_supply.write(current_supply + amount);

            // 3. Emitir evento (from = 0x0 indica tokens nuevos)
            let zero_address = starknet::contract_address_const::<0>();
            self.emit(Transfer { from: zero_address, to, value: amount });
        }

        // ============================================
        // METADATA - Información del Token
        // ============================================

        fn name(self: @ContractState) -> ByteArray {
            "Wrapped Bitcoin"
        }

        fn symbol(self: @ContractState) -> ByteArray {
            "wBTC"
        }

        fn decimals(self: @ContractState) -> u8 {
            8_u8 // Bitcoin usa 8 decimales
        }
    }

    // ============================================
    // FUNCIONES INTERNAS
    // ============================================

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        // Función interna para transferir tokens
        // Verifica balances y actualiza el storage
        fn _transfer(
            ref self: ContractState,
            sender: ContractAddress,
            recipient: ContractAddress,
            amount: u256,
        ) {
            // 1. Verificar que el sender tenga suficientes tokens
            let sender_balance = self.balances.read(sender);
            assert(sender_balance >= amount, 'Insufficient balance');

            // 2. Reducir balance del sender
            self.balances.write(sender, sender_balance - amount);

            // 3. Aumentar balance del recipient
            let recipient_balance = self.balances.read(recipient);
            self.balances.write(recipient, recipient_balance + amount);

            // 4. Emitir evento
            self.emit(Transfer { from: sender, to: recipient, value: amount });
        }
    }
}
