// Test script for Chainlink Functions integration with Travelsure API
// This script helps test the oracle functionality

import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("Testing Travelsure API integration with Chainlink Functions...");

  // Read the JavaScript source code
  const sourceFile = path.join(__dirname, "travelsure-oracle-source.js");
  const source = fs.readFileSync(sourceFile, "utf8");
  
  console.log("JavaScript source loaded, length:", source.length);

  // Test parameters
  const testFlightNumber = "AA123"; // Example flight number
  const simulateDelay = true; // Test with delay simulation

  console.log(`\nTest parameters:`);
  console.log(`Flight Number: ${testFlightNumber}`);
  console.log(`Simulate Delay: ${simulateDelay}`);

  // Test the API directly first
  console.log(`\nTesting API directly...`);
  const testUrl = `https://travelsure-production.up.railway.app/api/flights?flightNumber=${testFlightNumber}&simulateDelay=${simulateDelay}`;
  console.log(`API URL: ${testUrl}`);
  
  try {
    const response = await fetch(testUrl);
    const data = await response.json();
    console.log("API Response:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("API test failed:", error);
  }

  // Instructions for deployment
  console.log(`\n=== Deployment Instructions ===`);
  console.log(
    `1. Deploy your PolicyManager contract with proper Chainlink Functions router`
  );
  console.log(`2. Set up Chainlink Functions subscription:`);
  console.log(`   - Visit https://functions.chain.link/`);
  console.log(`   - Create a new subscription`);
  console.log(`   - Fund it with LINK tokens`);
  console.log(`   - Add your contract as a consumer`);
  console.log(`3. Configure your contract with subscription details:`);
  console.log(`   - Call setFunctionsConfig(subscriptionId, gasLimit, donID)`);
  console.log(`4. Test the integration:`);
  console.log(`   - Buy a policy with buyPolicy()`);
  console.log(
    `   - Call requestVerification(policyId, "${testFlightNumber}", ${simulateDelay})`
  );

  console.log(`\n=== Network Configuration ===`);
  console.log(`For Ethereum Sepolia testnet:`);
  console.log(`- Router: 0xb83E47C2bC239B3bf370bc41e1459A34b41238D0`);
  console.log(`- DON ID: fun-ethereum-sepolia-1`);
  console.log(`- Gas Limit: 300000`);

  console.log(`\nFor Polygon Mumbai testnet:`);
  console.log(`- Router: 0x6E2dc0F9DB014aE19888F539E59285D2Ea04244C`);
  console.log(`- DON ID: fun-polygon-mumbai-1`);
  console.log(`- Gas Limit: 300000`);

  console.log(`\n=== Testing Tips ===`);
  console.log(`- Use simulateDelay=true to test delay scenarios`);
  console.log(`- Use simulateDelay=false to test no-delay scenarios`);
  console.log(`- The API has 250+ flight records for testing`);
  console.log(`- Try different flight numbers like: AA123, UA456, DL789`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
