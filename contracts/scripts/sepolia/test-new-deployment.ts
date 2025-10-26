import { network } from "hardhat";

/**
 * Test the newly deployed PolicyManagerSepolia contract with SQ961
 */

async function main() {
  const { ethers } = await network.connect();
  const [deployer] = await ethers.getSigners();

  // New contract addresses from deployment
  const managerAddress = "0x7215536447840E214bd884728dAd590Ed9DA71fB";
  const pyusdAddress = "0x89Bb53CE56F8dbBfA04ED566b3eE129682A2D5D1";
  
  const managerABI = [
    "function policies(uint256) external view returns (tuple(address,bytes32,uint64,uint64,uint64,uint256,uint256,uint8,uint8,string,string,string,string))",
    "function requestVerification(uint256) external returns (bytes32)",
    "function buyPolicy(tuple(bytes32 flightHash, uint64 departureTime, string departure, string arrival, string flightNumber, string flightDate) p, uint8 tier) external returns (uint256)",
    "function getTierPricing(uint8) external view returns (uint256, uint256, uint64)",
    "function nextPolicyId() external view returns (uint256)",
    "event PolicyPurchased(uint256 indexed, address indexed, bytes32, uint256, uint256, uint8)",
    "event OracleRequested(uint256 indexed, bytes32)",
    "event OracleResult(uint256 indexed, bool, uint64)"
  ];

  const pyusdABI = [
    "function approve(address,uint256) external returns (bool)",
    "function balanceOf(address) external view returns (uint256)",
    "function mint(address,uint256) external"
  ];

  const manager = new ethers.Contract(managerAddress, managerABI, deployer);
  const pyusd = new ethers.Contract(pyusdAddress, pyusdABI, deployer);

  console.log("🧪 Testing newly deployed PolicyManagerSepolia contract...");
  console.log("Manager Address:", managerAddress);
  console.log("PYUSD Address:", pyusdAddress);
  
  const flightNumber = "SQ961";
  const flightDate = "2025-10-26";
  
  console.log("\n📝 Creating new SQ961 policy...");
  
  // Get pricing
  const [premium] = await manager.getTierPricing(0);
  console.log("Premium:", ethers.formatUnits(premium, 6), "PYUSD");
  
  // Ensure deployer has enough PYUSD
  const deployerBalance = await pyusd.balanceOf(deployer.address);
  if (deployerBalance < premium) {
    console.log("Minting PYUSD for deployer...");
    await (await pyusd.mint(deployer.address, premium)).wait();
  }
  
  // Approve PYUSD spending
  await (await pyusd.approve(managerAddress, premium)).wait();
  
  // Create policy with current departure time so we can test immediately
  const flightHash = ethers.keccak256(ethers.toUtf8Bytes(`${flightNumber} ${flightDate}`));
  const departureTime = Math.floor(Date.now() / 1000); // Current time
  
  console.log("Creating policy with:");
  console.log("  Flight:", flightNumber);
  console.log("  Date:", flightDate);
  console.log("  Departure Time:", new Date(departureTime * 1000).toISOString());
  
  const buyPolicyTx = await manager.buyPolicy({
    flightHash,
    departureTime,
    departure: "Jakarta",
    arrival: "Singapore",
    flightNumber,
    flightDate
  }, 0);
  
  const buyReceipt = await buyPolicyTx.wait();
  
  // Extract policy ID
  console.log("Parsing events...");
  const policyPurchasedEvent = buyReceipt.logs.find((log: any) => {
    try {
      const parsed = manager.interface.parseLog(log);
      return parsed?.name === "PolicyPurchased";
    } catch {
      return false;
    }
  });
  
  if (!policyPurchasedEvent) {
    throw new Error("❌ Could not find PolicyPurchased event");
  }
  
  const parsedEvent = manager.interface.parseLog(policyPurchasedEvent);
  const policyId = parsedEvent?.args?.[0] as bigint;
  
  if (!policyId) {
    throw new Error("❌ Could not extract policy ID from event");
  }
  
  console.log(`✅ Created new SQ961 policy (ID: ${policyId})`);
  
  // Now test Chainlink Functions
  console.log("\n🔍 Requesting verification...");
  console.log("⚠️ This will call your API with SQ961!");
  
  try {
    const verificationTx = await manager.requestVerification(policyId);
    const verificationReceipt = await verificationTx.wait();
    console.log("✅ Verification requested!");
    
    // Extract request ID
    const oracleRequestedEvent = verificationReceipt.logs.find((log: any) => {
      try {
        const parsed = manager.interface.parseLog(log);
        return parsed?.name === "OracleRequested";
      } catch {
        return false;
      }
    });
    
    if (!oracleRequestedEvent) {
      throw new Error("❌ Could not find OracleRequested event");
    }
    
    const parsedOracleEvent = manager.interface.parseLog(oracleRequestedEvent);
    const requestId = parsedOracleEvent?.args?.requestId as string;
    
    console.log("Request ID:", requestId);
    console.log("\n🎉 SUCCESS! Chainlink Functions request initiated!");
    console.log("Your API will be called with: https://travelsure-production.up.railway.app/api/flights?flight_number=SQ961");
    console.log("\nMonitor your subscription at:");
    console.log("https://functions.chain.link/sepolia/subscriptions/5796");
    
    console.log("\n⏳ Waiting for fulfillment... (this may take 30-60 seconds)");
    
    // Listen for fulfillment
    const fulfillmentPromise = new Promise<{ occurred: boolean; delayMinutes: bigint }>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("❌ Fulfillment timeout after 3 minutes"));
      }, 3 * 60 * 1000);

      manager.on("OracleResult", (policyIdEvent: bigint, occurred: boolean, delayMinutes: bigint) => {
        if (policyIdEvent.toString() === policyId.toString()) {
          clearTimeout(timeout);
          resolve({ occurred, delayMinutes });
        }
      });
    });

    try {
      const result = await fulfillmentPromise;
      console.log("\n🎉 Chainlink Functions fulfilled!");
      console.log("  Occurred:", result.occurred);
      console.log("  Delay Minutes:", result.delayMinutes.toString());
      
      console.log("\n📊 Results Summary:");
      if (result.occurred) {
        console.log("✅ Flight was delayed - policy should be paid out");
        console.log(`⏰ Delay: ${result.delayMinutes} minutes`);
      } else {
        console.log("❌ Flight was not delayed - no payout");
      }
      
      console.log("\n✅ SUCCESS: Chainlink Functions integration is working!");
      console.log("✅ Your API was called successfully with SQ961");
      console.log("✅ Oracle response was received and processed");
      
    } catch (error) {
      console.error("❌ Fulfillment failed:", (error as Error).message);
    }
    
  } catch (error) {
    if ((error as Error).message.includes("Too early")) {
      console.log("\n⏰ POLICY DEPARTURE TIME NOT REACHED YET");
      console.log("This shouldn't happen with current time - there might be an issue");
    } else {
      throw error;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Failed:", error);
    process.exit(1);
  });
