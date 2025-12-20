use btc_lending_project::{IBTCLendingDispatcher, IBTCLendingDispatcherTrait};
use snforge_std::{ContractClassTrait, DeclareResultTrait, declare};
use starknet::{ContractAddress, contract_address_const};

fn deploy_lending_contract(wbtc_address: ContractAddress) -> ContractAddress {
    let contract = declare("BTCLending").unwrap().contract_class();

    let mut constructor_calldata = ArrayTrait::new();
    constructor_calldata.append(wbtc_address.into());
    constructor_calldata.append(8000); // 80% liquidation threshold
    constructor_calldata.append(0); // high part of u256

    let (contract_address, _) = contract.deploy(@constructor_calldata).unwrap();
    contract_address
}

#[test]
fn test_health_factor_no_debt() {
    // Test básico: verificar que sin deuda, el health factor es máximo
    let mock_wbtc: ContractAddress = contract_address_const::<0x999>();
    let lending_address = deploy_lending_contract(mock_wbtc);

    let user: ContractAddress = contract_address_const::<0x123>();

    let lending_dispatcher = IBTCLendingDispatcher { contract_address: lending_address };

    // Sin deuda, el health factor debe ser máximo
    let health_factor = lending_dispatcher.calculate_health_factor(user);
    assert(health_factor == 999_999_999, 'Invalid HF for no debt');
}

#[test]
fn test_get_user_collateral_initial() {
    // Test: verificar que el colateral inicial es 0
    let mock_wbtc: ContractAddress = contract_address_const::<0x888>();
    let lending_address = deploy_lending_contract(mock_wbtc);

    let user: ContractAddress = contract_address_const::<0x456>();

    let lending_dispatcher = IBTCLendingDispatcher { contract_address: lending_address };

    let collateral = lending_dispatcher.get_user_collateral(user);
    assert(collateral == 0, 'Initial collateral should be 0');
}

#[test]
fn test_contract_deployment() {
    // Test: verificar que el contrato se despliega correctamente
    let mock_wbtc: ContractAddress = contract_address_const::<0x777>();
    let lending_address = deploy_lending_contract(mock_wbtc);

    // Si llegamos aquí, el deployment fue exitoso
    assert(lending_address.into() != 0, 'Deployment failed');
}
