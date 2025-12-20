use btc_lending_project::mocks::erc20_mock::{IERC20MockDispatcher, IERC20MockDispatcherTrait};
use btc_lending_project::{IBTCLendingDispatcher, IBTCLendingDispatcherTrait};
use snforge_std::{
    ContractClassTrait, DeclareResultTrait, declare, start_cheat_caller_address,
    stop_cheat_caller_address,
};
use starknet::{ContractAddress, contract_address_const};

fn deploy_mock_wbtc() -> ContractAddress {
    let contract = declare("MockWBTC").unwrap().contract_class();
    let (contract_address, _) = contract.deploy(@ArrayTrait::new()).unwrap();
    contract_address
}

fn deploy_lending_contract(wbtc_address: ContractAddress) -> ContractAddress {
    let contract = declare("BTCLending").unwrap().contract_class();

    let mut constructor_calldata = ArrayTrait::new();
    constructor_calldata.append(wbtc_address.into());
    constructor_calldata.append(8000); // 80% liquidation threshold
    constructor_calldata.append(0); // high part of u256

    let (contract_address, _) = contract.deploy(@constructor_calldata).unwrap();
    contract_address
}

// ========== TESTS BÁSICOS ==========

#[test]
fn test_health_factor_no_debt() {
    let wbtc_address = deploy_mock_wbtc();
    let lending_address = deploy_lending_contract(wbtc_address);

    let user: ContractAddress = contract_address_const::<0x123>();

    let lending_dispatcher = IBTCLendingDispatcher { contract_address: lending_address };

    let health_factor = lending_dispatcher.calculate_health_factor(user);
    assert(health_factor == 999_999_999, 'Invalid HF for no debt');
}

#[test]
fn test_get_user_collateral_initial() {
    let wbtc_address = deploy_mock_wbtc();
    let lending_address = deploy_lending_contract(wbtc_address);

    let user: ContractAddress = contract_address_const::<0x456>();

    let lending_dispatcher = IBTCLendingDispatcher { contract_address: lending_address };

    let collateral = lending_dispatcher.get_user_collateral(user);
    assert(collateral == 0, 'Initial collateral should be 0');
}

// ========== TESTS DE DEPÓSITO CON MOCK ERC20 ==========

#[test]
fn test_deposit_collateral_with_mock() {
    let wbtc_address = deploy_mock_wbtc();
    let lending_address = deploy_lending_contract(wbtc_address);

    let user: ContractAddress = contract_address_const::<0x789>();
    let deposit_amount: u256 = 100_000_000; // 1 BTC (8 decimals)

    // 1. Mint wBTC al usuario
    let wbtc_dispatcher = IERC20MockDispatcher { contract_address: wbtc_address };
    wbtc_dispatcher.mint(user, deposit_amount);

    // 2. Usuario aprueba el lending contract
    start_cheat_caller_address(wbtc_address, user);
    wbtc_dispatcher.approve(lending_address, deposit_amount);
    stop_cheat_caller_address(wbtc_address);

    // 3. Usuario deposita colateral
    start_cheat_caller_address(lending_address, user);
    let lending_dispatcher = IBTCLendingDispatcher { contract_address: lending_address };
    lending_dispatcher.deposit_collateral(deposit_amount);
    stop_cheat_caller_address(lending_address);

    // 4. Verificar que el colateral se registró
    let user_collateral = lending_dispatcher.get_user_collateral(user);
    assert(user_collateral == deposit_amount, 'Collateral not deposited');

    // 5. Verificar que el wBTC se transfirió al contrato
    let contract_balance = wbtc_dispatcher.balance_of(lending_address);
    assert(contract_balance == deposit_amount, 'wBTC not transferred');
}

// ========== TESTS DE PRÉSTAMO (BORROW) ==========

#[test]
fn test_borrow_with_sufficient_collateral() {
    let wbtc_address = deploy_mock_wbtc();
    let lending_address = deploy_lending_contract(wbtc_address);

    let user: ContractAddress = contract_address_const::<0xABC>();
    let deposit_amount: u256 = 100_000_000; // 1 BTC
    // Precio BTC = $60k, entonces 1 BTC = 6000000000000 en escala interna
    // Pedimos $30k = 3000000000000
    let borrow_amount: u256 = 3000000000000;

    // Setup: Depositar colateral
    let wbtc_dispatcher = IERC20MockDispatcher { contract_address: wbtc_address };
    wbtc_dispatcher.mint(user, deposit_amount);

    start_cheat_caller_address(wbtc_address, user);
    wbtc_dispatcher.approve(lending_address, deposit_amount);
    stop_cheat_caller_address(wbtc_address);

    start_cheat_caller_address(lending_address, user);
    let lending_dispatcher = IBTCLendingDispatcher { contract_address: lending_address };
    lending_dispatcher.deposit_collateral(deposit_amount);

    // Pedir préstamo
    lending_dispatcher.borrow(borrow_amount);
    stop_cheat_caller_address(lending_address);

    // Verificar deuda
    let user_debt = lending_dispatcher.get_user_debt(user);
    assert(user_debt == borrow_amount, 'Debt not recorded');

    // Verificar health factor > 1
    let health_factor = lending_dispatcher.calculate_health_factor(user);
    assert(health_factor >= 100, 'HF should be >= 1');
}

#[test]
#[should_panic(expected: ('Health factor too low',))]
fn test_borrow_fails_with_insufficient_collateral() {
    let wbtc_address = deploy_mock_wbtc();
    let lending_address = deploy_lending_contract(wbtc_address);

    let user: ContractAddress = contract_address_const::<0xDEF>();
    let deposit_amount: u256 = 100_000_000; // 1 BTC
    // Intentar pedir más del 80% del colateral (debería fallar)
    // 1 BTC = $60k, 80% = $48k, pedimos $50k
    let borrow_amount: u256 = 5000000000000;

    // Setup
    let wbtc_dispatcher = IERC20MockDispatcher { contract_address: wbtc_address };
    wbtc_dispatcher.mint(user, deposit_amount);

    start_cheat_caller_address(wbtc_address, user);
    wbtc_dispatcher.approve(lending_address, deposit_amount);
    stop_cheat_caller_address(wbtc_address);

    start_cheat_caller_address(lending_address, user);
    let lending_dispatcher = IBTCLendingDispatcher { contract_address: lending_address };
    lending_dispatcher.deposit_collateral(deposit_amount);

    // Esto debería fallar
    lending_dispatcher.borrow(borrow_amount);
    stop_cheat_caller_address(lending_address);
}

// ========== TESTS DE LIQUIDACIÓN CON CAÍDA DE PRECIO ==========

#[test]
fn test_liquidation_after_price_drop() {
    let wbtc_address = deploy_mock_wbtc();
    let lending_address = deploy_lending_contract(wbtc_address);

    let user: ContractAddress = contract_address_const::<0x111>();
    let liquidator: ContractAddress = contract_address_const::<0x222>();
    let deposit_amount: u256 = 100_000_000; // 1 BTC
    let borrow_amount: u256 = 4000000000000; // $40k USD

    // 1. Usuario deposita y pide préstamo
    let wbtc_dispatcher = IERC20MockDispatcher { contract_address: wbtc_address };
    wbtc_dispatcher.mint(user, deposit_amount);

    start_cheat_caller_address(wbtc_address, user);
    wbtc_dispatcher.approve(lending_address, deposit_amount);
    stop_cheat_caller_address(wbtc_address);

    start_cheat_caller_address(lending_address, user);
    let lending_dispatcher = IBTCLendingDispatcher { contract_address: lending_address };
    lending_dispatcher.deposit_collateral(deposit_amount);
    lending_dispatcher.borrow(borrow_amount);
    stop_cheat_caller_address(lending_address);

    // 2. Verificar que el usuario está saludable inicialmente
    let initial_hf = lending_dispatcher.calculate_health_factor(user);
    assert(initial_hf >= 100, 'Should be healthy initially');

    // 3. SIMULAR CAÍDA DE PRECIO: BTC cae de $60k a $45k
    lending_dispatcher.set_oracle_price(4500000000000);

    // 4. Verificar que ahora el health factor < 1
    let new_hf = lending_dispatcher.calculate_health_factor(user);
    assert(new_hf < 100, 'Should be unhealthy now');

    // 5. Liquidador ejecuta la liquidación
    start_cheat_caller_address(lending_address, liquidator);
    lending_dispatcher.liquidate(user);
    stop_cheat_caller_address(lending_address);

    // 6. Verificar que la posición del usuario se limpió
    let user_collateral_after = lending_dispatcher.get_user_collateral(user);
    let user_debt_after = lending_dispatcher.get_user_debt(user);
    assert(user_collateral_after == 0, 'Collateral should be 0');
    assert(user_debt_after == 0, 'Debt should be 0');

    // 7. Verificar que el liquidador recibió el colateral
    let liquidator_balance = wbtc_dispatcher.balance_of(liquidator);
    assert(liquidator_balance == deposit_amount, 'Liquidator should get BTC');
}

#[test]
#[should_panic(expected: ('User is healthy',))]
fn test_cannot_liquidate_healthy_user() {
    let wbtc_address = deploy_mock_wbtc();
    let lending_address = deploy_lending_contract(wbtc_address);

    let user: ContractAddress = contract_address_const::<0x333>();
    let liquidator: ContractAddress = contract_address_const::<0x444>();
    let deposit_amount: u256 = 100_000_000;
    let borrow_amount: u256 = 3000000000000; // $30k

    // Setup: Usuario saludable
    let wbtc_dispatcher = IERC20MockDispatcher { contract_address: wbtc_address };
    wbtc_dispatcher.mint(user, deposit_amount);

    start_cheat_caller_address(wbtc_address, user);
    wbtc_dispatcher.approve(lending_address, deposit_amount);
    stop_cheat_caller_address(wbtc_address);

    start_cheat_caller_address(lending_address, user);
    let lending_dispatcher = IBTCLendingDispatcher { contract_address: lending_address };
    lending_dispatcher.deposit_collateral(deposit_amount);
    lending_dispatcher.borrow(borrow_amount);
    stop_cheat_caller_address(lending_address);

    // Intentar liquidar (debería fallar)
    start_cheat_caller_address(lending_address, liquidator);
    lending_dispatcher.liquidate(user);
    stop_cheat_caller_address(lending_address);
}

// ========== TEST DE HEALTH FACTOR CON DIFERENTES PRECIOS ==========

#[test]
fn test_health_factor_changes_with_price() {
    let wbtc_address = deploy_mock_wbtc();
    let lending_address = deploy_lending_contract(wbtc_address);

    let user: ContractAddress = contract_address_const::<0x555>();
    let deposit_amount: u256 = 100_000_000; // 1 BTC
    let borrow_amount: u256 = 4000000000000; // $40k

    // Setup
    let wbtc_dispatcher = IERC20MockDispatcher { contract_address: wbtc_address };
    wbtc_dispatcher.mint(user, deposit_amount);

    start_cheat_caller_address(wbtc_address, user);
    wbtc_dispatcher.approve(lending_address, deposit_amount);
    stop_cheat_caller_address(wbtc_address);

    start_cheat_caller_address(lending_address, user);
    let lending_dispatcher = IBTCLendingDispatcher { contract_address: lending_address };
    lending_dispatcher.deposit_collateral(deposit_amount);
    lending_dispatcher.borrow(borrow_amount);
    stop_cheat_caller_address(lending_address);

    // HF con BTC = $60k
    let hf_60k = lending_dispatcher.calculate_health_factor(user);

    // Cambiar precio a $50k
    lending_dispatcher.set_oracle_price(5000000000000);
    let hf_50k = lending_dispatcher.calculate_health_factor(user);

    // Cambiar precio a $70k
    lending_dispatcher.set_oracle_price(7000000000000);
    let hf_70k = lending_dispatcher.calculate_health_factor(user);

    // Verificar que HF aumenta con el precio
    assert(hf_70k > hf_60k, 'HF should increase');
    assert(hf_60k > hf_50k, 'HF should decrease');
}
