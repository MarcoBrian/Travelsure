const hre = require("hardhat");

async function main() {
  const packageManagerAddress = "0xYOUR_PACKAGE_MANAGER_ADDRESS"; // We need to get this
  
  const packageManager = await hre.ethers.getContractAt("PackageManager", packageManagerAddress);
  
  console.log("Creating Silver package...");
  const tx1 = await packageManager.createPackage(
    "Silver Package",
    hre.ethers.parseUnits("5000", 6),
    180 * 24 * 60 * 60,
    350,
    3
  );
  await tx1.wait();
  console.log("✓ Silver package created");
  
  console.log("Creating Gold package...");
  const tx2 = await packageManager.createPackage(
    "Gold Package",
    hre.ethers.parseUnits("10000", 6),
    365 * 24 * 60 * 60,
    350,
    6
  );
  await tx2.wait();
  console.log("✓ Gold package created");
  
  console.log("\nAll packages created successfully!");
}

main().catch(console.error);
