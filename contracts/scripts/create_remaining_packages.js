import { ethers } from "hardhat";

async function main() {
  // Deployed PackageManager address
  const packageManagerAddress = "0x114D7280437B3DEc85F34EebE6B987657dc9d0a8";
  
  const packageManager = await ethers.getContractAt("PackageManager", packageManagerAddress);
  
  // Check current packages
  console.log("Current package count:", await packageManager.packageCount());
  
  console.log("\n📦 Creating Silver package...");
  const tx1 = await packageManager.createPackage(
    "Silver Package",
    ethers.parseUnits("5000", 6),      // $5,000 USDC
    180 * 24 * 60 * 60,                 // 180 days
    350,                                 // 3.5% APY
    3                                    // 3 free policies
  );
  console.log("Transaction sent:", tx1.hash);
  await tx1.wait();
  console.log("✅ Silver package created!");
  
  console.log("\n📦 Creating Gold package...");
  const tx2 = await packageManager.createPackage(
    "Gold Package",
    ethers.parseUnits("10000", 6),     // $10,000 USDC
    365 * 24 * 60 * 60,                 // 365 days
    350,                                 // 3.5% APY
    6                                    // 6 free policies
  );
  console.log("Transaction sent:", tx2.hash);
  await tx2.wait();
  console.log("✅ Gold package created!");
  
  // Verify all packages
  console.log("\n✅ Package count:", await packageManager.packageCount());
  
  console.log("\n📋 Package Details:");
  for (let i = 0; i < 3; i++) {
    const pkg = await packageManager.getPackageInfo(i);
    console.log(`\nPackage ${i}: ${pkg.name}`);
    console.log(`  Min Stake: ${ethers.formatUnits(pkg.minStake, 6)} USDC`);
    console.log(`  Lock Duration: ${Number(pkg.lockDuration) / (24*60*60)} days`);
    console.log(`  Yield Rate: ${Number(pkg.yieldRateBps) / 100}%`);
    console.log(`  Free Policies: ${pkg.insuranceClaims}`);
  }
  
  console.log("\n🎉 All packages created successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
