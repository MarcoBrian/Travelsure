import { network } from "hardhat";

/**
 * Add PolicyManagerSepolia contract as authorized consumer to Chainlink Functions subscription
 * 
 * This script connects to the Chainlink Functions Coordinator contract and adds
 * your deployed PolicyManagerSepolia contract as an authorized consumer.
 * 
 * Prerequisites:
 * 1. Deploy PolicyManagerSepolia to Sepolia first
 * 2. Have a Chainlink Functions subscription with sufficient LINK balance
 * 3. Be the owner of the subscription
 * 
 * Usage:
 * npx hardhat run scripts/add-consumer.ts --network sepolia
 */

// Chainlink Functions Coordinator address for Sepolia
const FUNCTIONS_COORDINATOR_SEPOLIA = "0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE";

async function main() {
  const { ethers } = await network.connect();
  const [deployer] = await ethers.getSigners();

  console.log("🔗 Adding contract as Chainlink Functions consumer...");
  console.log("Deployer address:", deployer.address);

  // Get environment variables
  const subscriptionId = process.env.CHAINLINK_SUBSCRIPTION_ID;
  const managerAddress = process.env.POLICY_MANAGER_ADDRESS; // Set this after deployment

  if (!subscriptionId) {
    throw new Error("❌ Missing CHAINLINK_SUBSCRIPTION_ID in environment variables");
  }

  if (!managerAddress) {
    throw new Error("❌ Missing POLICY_MANAGER_ADDRESS in environment variables. Set this to your deployed contract address.");
  }

  console.log("📋 Configuration:");
  console.log("  Subscription ID:", subscriptionId);
  console.log("  Manager Address:", managerAddress);
  console.log("  Coordinator:", FUNCTIONS_COORDINATOR_SEPOLIA);

  // Connect to Functions Coordinator
  const coordinatorABI = [
    "function addConsumer(uint64 subId, address consumer) external",
    "function removeConsumer(uint64 subId, address consumer) external",
    "function getSubscription(uint64 subId) external view returns (address owner, uint96 balance, uint64 reqCount, address[] memory consumers)",
    "function isAuthorizedConsumer(address consumer, uint64 subId) external view returns (bool)"
  ];

  const coordinator = new ethers.Contract(
    FUNCTIONS_COORDINATOR_SEPOLIA,
    coordinatorABI,
    deployer
  );

  // Check if already authorized
  console.log("\n🔍 Checking current authorization...");
  const isAuthorized = await coordinator.isAuthorizedConsumer(managerAddress, BigInt(subscriptionId));
  
  if (isAuthorized) {
    console.log("✅ Contract is already authorized as a consumer");
    return;
  }

  // Get subscription details
  console.log("\n📊 Subscription details:");
  const subscription = await coordinator.getSubscription(BigInt(subscriptionId));
  console.log("  Owner:", subscription.owner);
  console.log("  Balance:", ethers.formatEther(subscription.balance), "LINK");
  console.log("  Request Count:", subscription.reqCount.toString());
  console.log("  Consumers:", subscription.consumers.length);

  // Check if deployer is subscription owner
  if (subscription.owner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error(`❌ Deployer ${deployer.address} is not the owner of subscription ${subscriptionId}. Owner is ${subscription.owner}`);
  }

  // Add consumer
  console.log("\n➕ Adding contract as consumer...");
  const addConsumerTx = await coordinator.addConsumer(BigInt(subscriptionId), managerAddress);
  console.log("Transaction hash:", addConsumerTx.hash);
  
  const receipt = await addConsumerTx.wait();
  console.log("✅ Consumer added successfully!");
  console.log("Gas used:", receipt.gasUsed.toString());

  // Verify authorization
  console.log("\n🔍 Verifying authorization...");
  const isNowAuthorized = await coordinator.isAuthorizedConsumer(managerAddress, BigInt(subscriptionId));
  
  if (isNowAuthorized) {
    console.log("✅ Contract is now authorized as a consumer");
  } else {
    console.log("❌ Authorization failed");
  }

  console.log("\n🎉 Setup Complete!");
  console.log("=====================================");
  console.log("Contract:", managerAddress);
  console.log("Subscription:", subscriptionId);
  console.log("Authorized:", isNowAuthorized);
  console.log("=====================================");
  
  console.log("\n📋 Next Steps:");
  console.log("1. Test the deployment:");
  console.log(`   npx hardhat run scripts/test-sepolia-e2e.ts --network sepolia`);
  console.log("2. Monitor your subscription at:");
  console.log(`   https://functions.chain.link/sepolia/subscriptions/${subscriptionId}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Failed to add consumer:", error);
    process.exit(1);
  });
