import { describe, it, before, beforeEach } from "mocha";
import { expect } from "chai";
import { network } from "hardhat";

describe("Staking Contracts Integration", function () {
  let ethers: any;
  let owner: any, user1: any, user2: any;
  let usdc: any, pyusd: any;
  let aaveAdapter: any, insurancePool: any, packageManager: any;

  before(async () => {
    ({ ethers } = await network.connect());
    [owner, user1, user2] = await ethers.getSigners();
  });

  beforeEach(async () => {
    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();

    // Deploy MockPYUSD
    const MockPYUSD = await ethers.getContractFactory("PYUSDMock");
    pyusd = await MockPYUSD.deploy();

    // Deploy AaveV3Adapter with Sepolia addresses
    const AaveAdapter = await ethers.getContractFactory("AaveV3Adapter");
    const AAVE_POOL = "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951";
    const AUSDC = "0x16dA4541aD1807f4443d92D26044C1147406EB80";
    aaveAdapter = await AaveAdapter.deploy(usdc.target, AUSDC, AAVE_POOL);

    // Deploy InsuranceSubsidyPool
    const InsurancePool = await ethers.getContractFactory("InsuranceSubsidyPool");
    insurancePool = await InsurancePool.deploy(usdc.target, pyusd.target);

    // Deploy PackageManager
    const PackageManager = await ethers.getContractFactory("PackageManager");
    packageManager = await PackageManager.deploy(usdc.target);

    // Wire contracts
    await aaveAdapter.setPackageManager(packageManager.target);
    await insurancePool.setPackageManager(packageManager.target);
    await packageManager.setAaveAdapter(aaveAdapter.target);
    await packageManager.setInsurancePool(insurancePool.target);

    // Mint USDC to users
    await usdc.mint(user1.address, ethers.parseUnits("100000", 6));
    await usdc.mint(user2.address, ethers.parseUnits("50000", 6));
  });

  describe("PackageManager", function () {
    it("Should deploy successfully", async function () {
      expect(await packageManager.USDC()).to.equal(usdc.target);
      expect(await packageManager.packageCount()).to.equal(0);
    });

    it("Should create Bronze package", async function () {
      await packageManager.createPackage(
        "Bronze",
        ethers.parseUnits("1000", 6),
        90 * 24 * 60 * 60,
        350,
        1
      );

      const pkg = await packageManager.getPackageInfo(0);
      expect(pkg.name).to.equal("Bronze");
      expect(pkg.minStake).to.equal(ethers.parseUnits("1000", 6));
      expect(pkg.yieldRateBps).to.equal(350);
      expect(pkg.insuranceClaims).to.equal(1);
    });

    it("Should create multiple packages", async function () {
      await packageManager.createPackage("Bronze", ethers.parseUnits("1000", 6), 90 * 24 * 60 * 60, 350, 1);
      await packageManager.createPackage("Silver", ethers.parseUnits("5000", 6), 180 * 24 * 60 * 60, 350, 3);
      await packageManager.createPackage("Gold", ethers.parseUnits("10000", 6), 365 * 24 * 60 * 60, 350, 6);

      expect(await packageManager.packageCount()).to.equal(3);
      const packages = await packageManager.getAllPackages();
      expect(packages.length).to.equal(3);
    });

    it("Should allow user to stake in Bronze package", async function () {
      // Create package
      await packageManager.createPackage(
        "Bronze",
        ethers.parseUnits("1000", 6),
        90 * 24 * 60 * 60,
        350,
        1
      );

      const stakeAmount = ethers.parseUnits("1000", 6);

      // Approve and stake
      await usdc.connect(user1).approve(packageManager.target, stakeAmount);
      await packageManager.connect(user1).buyPackage(0, stakeAmount);

      // Check stake
      const userStake = await packageManager.getUserStake(user1.address);
      expect(userStake.isActive).to.be.true;
      expect(userStake.stakedAmount).to.equal(stakeAmount);
      expect(userStake.packageId).to.equal(0);
      expect(userStake.claimsAllowed).to.equal(1);
      expect(userStake.claimsUsed).to.equal(0);
    });

    it("Should revert if stake below minimum", async function () {
      await packageManager.createPackage("Bronze", ethers.parseUnits("1000", 6), 90 * 24 * 60 * 60, 350, 1);

      const lowAmount = ethers.parseUnits("500", 6);
      await usdc.connect(user1).approve(packageManager.target, lowAmount);

      await expect(
        packageManager.connect(user1).buyPackage(0, lowAmount)
      ).to.be.revertedWith("Below minimum stake");
    });

    it("Should allow staker to register insurance", async function () {
      await packageManager.createPackage("Bronze", ethers.parseUnits("1000", 6), 90 * 24 * 60 * 60, 350, 1);

      const stakeAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(user1).approve(packageManager.target, stakeAmount);
      await packageManager.connect(user1).buyPackage(0, stakeAmount);

      // Register insurance
      await expect(packageManager.connect(user1).registerInsurance())
        .to.emit(packageManager, "InsuranceRegistered")
        .withArgs(user1.address, 0); // 0 claims remaining

      const userStake = await packageManager.getUserStake(user1.address);
      expect(userStake.claimsUsed).to.equal(1);
    });

    it("Should check if user can register insurance", async function () {
      // Before staking
      let result = await packageManager.canRegisterInsurance(user1.address);
      expect(result[0]).to.be.false; // canRegister
      expect(result[1]).to.equal(0); // claimsRemaining

      // After staking
      await packageManager.createPackage("Silver", ethers.parseUnits("5000", 6), 180 * 24 * 60 * 60, 350, 3);
      const stakeAmount = ethers.parseUnits("5000", 6);
      await usdc.connect(user1).approve(packageManager.target, stakeAmount);
      await packageManager.connect(user1).buyPackage(0, stakeAmount);

      result = await packageManager.canRegisterInsurance(user1.address);
      expect(result[0]).to.be.true;
      expect(result[1]).to.equal(3);

      // After using 1 claim
      await packageManager.connect(user1).registerInsurance();
      result = await packageManager.canRegisterInsurance(user1.address);
      expect(result[0]).to.be.true;
      expect(result[1]).to.equal(2);
    });
  });

  describe("AaveV3Adapter", function () {
    it("Should deploy with correct addresses", async function () {
      expect(await aaveAdapter.USDC()).to.equal(usdc.target);
      expect(await aaveAdapter.totalDeposited()).to.equal(0);
    });

    it("Should set PackageManager", async function () {
      expect(await aaveAdapter.packageManager()).to.equal(packageManager.target);
    });
  });

  describe("InsuranceSubsidyPool", function () {
    it("Should deploy successfully", async function () {
      expect(await insurancePool.USDC()).to.equal(usdc.target);
      expect(await insurancePool.PYUSD()).to.equal(pyusd.target);
      expect(await insurancePool.totalPoliciesFunded()).to.equal(0);
    });

    it("Should mint PYUSD for testnet", async function () {
      const mintAmount = ethers.parseUnits("10000", 6);
      await insurancePool.mintPYUSDForTestnet(mintAmount);

      const balance = await pyusd.balanceOf(insurancePool.target);
      expect(balance).to.be.gte(mintAmount);
    });

    it("Should check if can fund policy", async function () {
      // Before funding
      const premium = ethers.parseUnits("20", 6);
      expect(await insurancePool.canFundPolicy(premium)).to.be.false;

      // After minting PYUSD
      await insurancePool.mintPYUSDForTestnet(ethers.parseUnits("10000", 6));
      expect(await insurancePool.canFundPolicy(premium)).to.be.true;
    });
  });
});
