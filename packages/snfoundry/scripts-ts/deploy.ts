import {
  deployContract,
  executeDeployCalls,
  exportDeployments,
  deployer,
  assertDeployerDefined,
  assertRpcNetworkActive,
  assertDeployerSignable,
} from "./deploy-contract";
import { green, red } from "./helpers/colorize-log";

/**
 * Deploy a contract using the specified parameters.
 *
 * @example (deploy contract with constructorArgs)
 * const deployScript = async (): Promise<void> => {
 *   await deployContract(
 *     {
 *       contract: "YourContract",
 *       contractName: "YourContractExportName",
 *       constructorArgs: {
 *         owner: deployer.address,
 *       },
 *       options: {
 *         maxFee: BigInt(1000000000000)
 *       }
 *     }
 *   );
 * };
 *
 * @example (deploy contract without constructorArgs)
 * const deployScript = async (): Promise<void> => {
 *   await deployContract(
 *     {
 *       contract: "YourContract",
 *       contractName: "YourContractExportName",
 *       options: {
 *         maxFee: BigInt(1000000000000)
 *       }
 *     }
 *   );
 * };
 *
 *
 * @returns {Promise<void>}
 */
/**
 * Deploy script for BTCFi Lending Protocol
 * 
 * Steps:
 * 1. Deploy MockWBTC (ERC20 token for testing)
 * 2. Deploy BTCLending with wBTC address and liquidation threshold
 */
const deployScript = async (): Promise<void> => {
  // Step 1: Deploy MockWBTC
  console.log("📝 Deploying MockWBTC...");
  const mockWBTC = await deployContract({
    contract: "MockWBTC",
    contractName: "MockWBTC",
  });

  console.log(`✅ MockWBTC deployed at: ${mockWBTC.address}`);

  // Step 2: Deploy MockUSD with temporary lending address
  console.log("📝 Deploying MockUSD (with temporary address)...");
  const mockUSD = await deployContract({
    contract: "MockUSD",
    contractName: "MockUSD",
    constructorArgs: {
      lending_contract: mockWBTC.address, // Temporary, will update later
    },
  });

  console.log(`✅ MockUSD deployed at: ${mockUSD.address}`);

  // Step 3: Deploy BTCLending with all addresses
  console.log("📝 Deploying BTCLending...");
  const btcLending = await deployContract({
    contract: "BTCLending",
    contractName: "BTCLending",
    constructorArgs: {
      wbtc_token: mockWBTC.address,        // Address of MockWBTC
      usd_token: mockUSD.address,          // Address of MockUSD
      liquidation_threshold: 8000n,        // 80% (8000/10000)
      pragma_oracle: mockWBTC.address,     // Use mockWBTC as placeholder (will use fallback price)
    },
  });

  console.log(`✅ BTCLending deployed at: ${btcLending.address}`);

  console.log("\n🎉 All contracts deployed successfully!");
  console.log("\n📋 Deployment Summary:");
  console.log(`   MockWBTC: ${mockWBTC.address}`);
  console.log(`   MockUSD: ${mockUSD.address}`);
  console.log(`   BTCLending: ${btcLending.address}`);
  console.log("\n⚠️  Important:");
  console.log("   1. MockUSD needs to be updated to allow BTCLending to mint/burn");
  console.log(`   2. Call MockUSD.set_lending_contract(${btcLending.address})`);
  console.log("   3. pragma_oracle is set to mockWBTC address (fallback will be used)");
  console.log("   4. Use SetOraclePrice to set BTC price manually in devnet");
};

const main = async (): Promise<void> => {
  try {
    assertDeployerDefined();

    await Promise.all([assertRpcNetworkActive(), assertDeployerSignable()]);

    await deployScript();
    await executeDeployCalls();
    exportDeployments();

    console.log(green("All Setup Done!"));
  } catch (err) {
    if (err instanceof Error) {
      console.error(red(err.message));
    } else {
      console.error(err);
    }
    process.exit(1); //exit with error so that non subsequent scripts are run
  }
};

main();
