import { network } from "hardhat";
import { loadAndValidateJsSource } from "../load-js-source.js";

/**
 * Deploy PolicyManagerSepolia to Sepolia testnet with real Chainlink Functions
 * 
 * Prerequisites:
 * 1. Copy env.example to .env and fill in your values
 * 2. Ensure you have Sepolia ETH for gas fees
 * 3. Have a Chainlink Functions subscription with sufficient LINK balance
 * 
 * Usage:
 * npx hardhat run scripts/deploy-sepolia.ts --network sepolia
 */

async function main() {
  const { ethers } = await network.connect();
  const [deployer] = await ethers.getSigners();

  console.log("🚀 Deploying to Sepolia testnet...");
  console.log("Deployer address:", deployer.address);
  
  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");
  
  if (balance < ethers.parseEther("0.01")) {
    throw new Error("❌ Insufficient ETH balance. Need at least 0.01 ETH for deployment.");
  }

  // Get environment variables
  const functionsRouter = process.env.CHAINLINK_FUNCTIONS_ROUTER;
  const donId = process.env.CHAINLINK_DON_ID;
  const subscriptionId = process.env.CHAINLINK_SUBSCRIPTION_ID;
  const fulfillGasLimit = process.env.CHAINLINK_FULFILL_GAS_LIMIT || "300000";

  if (!functionsRouter || !donId || !subscriptionId) {
    throw new Error("❌ Missing required environment variables. Check your .env file.");
  }

  console.log("📋 Configuration:");
  console.log("  Functions Router:", functionsRouter);
  console.log("  DON ID:", donId);
  console.log("  Subscription ID:", subscriptionId);
  console.log("  Fulfill Gas Limit:", fulfillGasLimit);

  // Use official PYUSD contract on Sepolia
  const pyusdAddress = "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9";
  console.log("\n📦 Using official PYUSD contract on Sepolia...");
  console.log("✅ PYUSD Address:", pyusdAddress);

  // Deploy PolicyManagerSepolia with real Chainlink Functions router
  console.log("\n📦 Deploying PolicyManagerSepolia...");
  const PolicyManagerSepolia = await ethers.getContractFactory("PolicyManagerSepolia");
  const manager = await PolicyManagerSepolia.deploy(functionsRouter, pyusdAddress);
  await manager.waitForDeployment();
  const managerAddress = await manager.getAddress();
  console.log("✅ PolicyManagerSepolia deployed to:", managerAddress);

  // Load and set JavaScript source code
  console.log("\n📝 Setting JavaScript source code...");
  const jsSource = loadAndValidateJsSource();
  const setSourceTx = await manager.setJsSource(jsSource);
  await setSourceTx.wait();
  console.log("✅ JavaScript source code set");

  // Configure Chainlink Functions parameters
  console.log("\n⚙️ Configuring Chainlink Functions...");
  const configTx = await manager.setFunctionsConfig(
    BigInt(subscriptionId),
    parseInt(fulfillGasLimit),
    donId
  );
  await configTx.wait();
  console.log("✅ Chainlink Functions configured");

  // Note: Cannot mint PYUSD from official contract
  console.log("\n💰 PYUSD Minting:");
  console.log("⚠️ Using official PYUSD contract - cannot mint tokens");
  console.log("📋 You'll need to acquire PYUSD tokens separately for testing");

  // Summary
  console.log("\n🎉 Deployment Complete!");
  console.log("=====================================");
  console.log("PYUSD (Official):", pyusdAddress);
  console.log("PolicyManagerSepolia:", managerAddress);
  console.log("Functions Router:", functionsRouter);
  console.log("DON ID:", donId);
  console.log("Subscription ID:", subscriptionId);
  console.log("=====================================");
  
  console.log("\n📋 Next Steps:");
  console.log("1. Add the contract as a consumer to your Chainlink subscription:");
  console.log(`   npx hardhat run scripts/add-consumer.ts --network sepolia`);
  console.log("2. Test the deployment:");
  console.log(`   npx hardhat run scripts/test-sepolia-e2e.ts --network sepolia`);
  console.log("3. Verify contracts on Etherscan (optional):");
  console.log(`   npx hardhat verify --network sepolia ${managerAddress} "${functionsRouter}" "${pyusdAddress}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
