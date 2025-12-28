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

  // Step 2: Deploy BTCLending
  console.log("📝 Deploying BTCLending...");
  await deployContract({
    contract: "BTCLending",
    contractName: "BTCLending",
    constructorArgs: {
      wbtc_token: mockWBTC.address,        // Address of MockWBTC
      liquidation_threshold: 8000n,        // 80% (8000/10000)
    },
  });

  console.log("✅ BTCLending deployed successfully!");
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
