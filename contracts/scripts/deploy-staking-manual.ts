import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();
  
  console.log("🚀 Starting manual staking contracts deployment...\n");

  const PYUSD_ADDRESS = "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0";
  const ROUTER_ADDRESS = "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e";

  console.log("Using existing contracts:");
  console.log("  PYUSD:", PYUSD_ADDRESS);
  console.log("  Router:", ROUTER_ADDRESS);
  console.log("");

  console.log("1️⃣  Deploying MockAToken...");
  const MockAToken = await ethers.getContractFactory("MockAToken");
  const aPYUSD = await MockAToken.deploy("Aave PYUSD", "aPYUSD", PYUSD_ADDRESS);
  await aPYUSD.waitForDeployment();
  const aPYUSDAddress = await aPYUSD.getAddress();
  console.log("  ✅ MockAToken deployed to:", aPYUSDAddress);
  console.log("");

  console.log("2️⃣  Deploying MockAavePool...");
  const MockAavePool = await ethers.getContractFactory("MockAavePool");
  const aavePool = await MockAavePool.deploy(PYUSD_ADDRESS, aPYUSDAddress);
  await aavePool.waitForDeployment();
  const aavePoolAddress = await aavePool.getAddress();
  console.log("  ✅ MockAavePool deployed to:", aavePoolAddress);
  console.log("");

  console.log("3️⃣  Deploying TierNFT...");
  const TierNFT = await ethers.getContractFactory("TierNFT");
  const tierNFT = await TierNFT.deploy("Travelsure Tier", "TSTIER");
  await tierNFT.waitForDeployment();
  const tierNFTAddress = await tierNFT.getAddress();
  console.log("  ✅ TierNFT deployed to:", tierNFTAddress);
  console.log("");

  console.log("4️⃣  Deploying TravelsureStaking...");
  const TravelsureStaking = await ethers.getContractFactory("TravelsureStaking");
  const staking = await TravelsureStaking.deploy(
    PYUSD_ADDRESS,
    aavePoolAddress,
    aPYUSDAddress,
    tierNFTAddress
  );
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log("  ✅ TravelsureStaking deployed to:", stakingAddress);
  console.log("");

  console.log("5️⃣  Deploying new PolicyManager with tier support...");
  const PolicyManager = await ethers.getContractFactory("PolicyManager");
  const policyManager = await PolicyManager.deploy(ROUTER_ADDRESS, PYUSD_ADDRESS);
  await policyManager.waitForDeployment();
  const policyManagerAddress = await policyManager.getAddress();
  console.log("  ✅ PolicyManager deployed to:", policyManagerAddress);
  console.log("");

  console.log("6️⃣  Connecting contracts...");
  
  console.log("  Setting staking contract on TierNFT...");
  const tx1 = await tierNFT.setStakingContract(stakingAddress);
  await tx1.wait();
  console.log("  ✅ TierNFT.setStakingContract() completed");

  console.log("  Setting TierNFT on PolicyManager...");
  const tx2 = await policyManager.setTierNFT(tierNFTAddress);
  await tx2.wait();
  console.log("  ✅ PolicyManager.setTierNFT() completed");
  console.log("");

  console.log("7️⃣  Funding MockAavePool with PYUSD for yield simulation...");
  const pyusd = await ethers.getContractAt("PYUSDMock", PYUSD_ADDRESS);
  const [deployer] = await ethers.getSigners();
  
  const poolLiquidity = ethers.parseUnits("100000", 6);
  const tx3 = await pyusd.mint(deployer.address, poolLiquidity);
  await tx3.wait();
  console.log("  Minted 100,000 PYUSD to deployer");

  const tx4 = await pyusd.approve(aavePoolAddress, poolLiquidity);
  await tx4.wait();
  console.log("  Approved pool to spend PYUSD");

  const tx5 = await aavePool.addLiquidity(poolLiquidity);
  await tx5.wait();
  console.log("  ✅ Added 100,000 PYUSD liquidity to MockAavePool");
  console.log("");

  console.log("🎉 Deployment Complete!\n");
  console.log("═══════════════════════════════════════════");
  console.log("📋 DEPLOYED ADDRESSES:");
  console.log("═══════════════════════════════════════════");
  console.log("PYUSDMock:          ", PYUSD_ADDRESS);
  console.log("Router:             ", ROUTER_ADDRESS);
  console.log("MockAToken:         ", aPYUSDAddress);
  console.log("MockAavePool:       ", aavePoolAddress);
  console.log("TierNFT:            ", tierNFTAddress);
  console.log("TravelsureStaking:  ", stakingAddress);
  console.log("PolicyManager:      ", policyManagerAddress);
  console.log("═══════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
