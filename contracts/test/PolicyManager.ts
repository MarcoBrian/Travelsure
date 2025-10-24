import { describe, it, before, beforeEach } from "mocha";
import { expect } from "chai";
import { network } from "hardhat";

describe("PolicyManager + MockFunctionsRouter (e2e)", function () {
  let ethers: any;
  let owner: any, user: any, other: any;

  let pyusd: any;
  let router: any;
  let manager: any;

  const DECIMALS = 6n;
  const ONE = 10n ** DECIMALS;
  const EXPIRY_WINDOW = 48n * 60n * 60n; // 48h

  // Tier configurations (matching contract defaults)
  const TIER_CONFIGS = {
    Basic: {
      payout: 100n * ONE,
      probBps: 3000n, // 30%
      marginBps: 500n, // 5%
      multiplierBps: 10000n, // 1x
      thresholdMinutes: 240n // 4 hours
    },
    Silver: {
      payout: 250n * ONE,
      probBps: 3200n, // 32%
      marginBps: 600n, // 6%
      multiplierBps: 12000n, // 1.2x
      thresholdMinutes: 180n // 3 hours
    },
    Gold: {
      payout: 500n * ONE,
      probBps: 3500n, // 35%
      marginBps: 700n, // 7%
      multiplierBps: 15000n, // 1.5x
      thresholdMinutes: 120n // 2 hours
    },
    Platinum: {
      payout: 1000n * ONE,
      probBps: 4000n, // 40%
      marginBps: 800n, // 8%
      multiplierBps: 15000n, // 1.5x (matches contract default)
      thresholdMinutes: 60n // 1 hour
    }
  };

  const quotePremium = (payout: bigint, probBps: bigint, marginBps: bigint, multiplierBps: bigint = 10000n) => {
    const base = (payout * probBps) / 10_000n;
    const basePremium = (base * (10_000n + marginBps)) / 10_000n;
    return (basePremium * multiplierBps) / 10_000n;
  };

  const now = async () => BigInt((await ethers.provider.getBlock("latest")).timestamp);
  const increase = async (secs: bigint) => {
    await ethers.provider.send("evm_increaseTime", [Number(secs)]);
    await ethers.provider.send("evm_mine", []);
  };
  const setTime = async (ts: bigint) => {
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(ts)]);
  };

  before(async () => {
    ({ ethers } = await network.connect());
    [owner, user, other] = await ethers.getSigners();
  });

  beforeEach(async () => {
    // Deploy PYUSD (your 6-decimals mock with free mint/burn)
    const PYUSD = await ethers.getContractFactory("PYUSDMock", owner);
    pyusd = await PYUSD.deploy();
    await pyusd.waitForDeployment();

    // Deploy your router
    const Router = await ethers.getContractFactory("MockFunctionsRouter", owner);
    router = await Router.deploy();
    await router.waitForDeployment();

    // Deploy PolicyManager hooked to router + token
    const M = await ethers.getContractFactory("PolicyManager", owner);
    manager = await M.deploy(await router.getAddress(), await pyusd.getAddress());
    await manager.waitForDeployment();

    // Pre-fund user for premiums and manager for claim payouts
    await (await pyusd.mint(user.address, 10_000n * ONE)).wait();
    await (await pyusd.mint(await manager.getAddress(), 10_000n * ONE)).wait();
  });

  it("constructor defaults - tier configurations", async () => {
    expect(await manager.PYUSD()).to.equal(await pyusd.getAddress());
    expect(await manager.pyusdDecimals()).to.equal(6);
    
    // Check Basic tier configuration
    const basicConfig = await manager.getTierConfig(0); // PolicyTier.Basic = 0
    expect(basicConfig.basePayout).to.equal(TIER_CONFIGS.Basic.payout);
    expect(basicConfig.probBps).to.equal(Number(TIER_CONFIGS.Basic.probBps));
    expect(basicConfig.marginBps).to.equal(Number(TIER_CONFIGS.Basic.marginBps));
    expect(basicConfig.premiumMultiplierBps).to.equal(Number(TIER_CONFIGS.Basic.multiplierBps));
    expect(basicConfig.thresholdMinutes).to.equal(Number(TIER_CONFIGS.Basic.thresholdMinutes));
    expect(basicConfig.active).to.equal(true);
    
    // Check Silver tier configuration
    const silverConfig = await manager.getTierConfig(1); // PolicyTier.Silver = 1
    expect(silverConfig.basePayout).to.equal(TIER_CONFIGS.Silver.payout);
    expect(silverConfig.probBps).to.equal(Number(TIER_CONFIGS.Silver.probBps));
    expect(silverConfig.marginBps).to.equal(Number(TIER_CONFIGS.Silver.marginBps));
    expect(silverConfig.premiumMultiplierBps).to.equal(Number(TIER_CONFIGS.Silver.multiplierBps));
    expect(silverConfig.thresholdMinutes).to.equal(Number(TIER_CONFIGS.Silver.thresholdMinutes));
    expect(silverConfig.active).to.equal(true);
    
    // Check Gold tier configuration
    const goldConfig = await manager.getTierConfig(2); // PolicyTier.Gold = 2
    expect(goldConfig.basePayout).to.equal(TIER_CONFIGS.Gold.payout);
    expect(goldConfig.probBps).to.equal(Number(TIER_CONFIGS.Gold.probBps));
    expect(goldConfig.marginBps).to.equal(Number(TIER_CONFIGS.Gold.marginBps));
    expect(goldConfig.premiumMultiplierBps).to.equal(Number(TIER_CONFIGS.Gold.multiplierBps));
    expect(goldConfig.thresholdMinutes).to.equal(Number(TIER_CONFIGS.Gold.thresholdMinutes));
    expect(goldConfig.active).to.equal(true);
    
    // Check Platinum tier configuration
    const platinumConfig = await manager.getTierConfig(3); // PolicyTier.Platinum = 3
    expect(platinumConfig.basePayout).to.equal(TIER_CONFIGS.Platinum.payout);
    expect(platinumConfig.probBps).to.equal(Number(TIER_CONFIGS.Platinum.probBps));
    expect(platinumConfig.marginBps).to.equal(Number(TIER_CONFIGS.Platinum.marginBps));
    expect(platinumConfig.premiumMultiplierBps).to.equal(Number(TIER_CONFIGS.Platinum.multiplierBps));
    expect(platinumConfig.thresholdMinutes).to.equal(Number(TIER_CONFIGS.Platinum.thresholdMinutes));
    expect(platinumConfig.active).to.equal(true);
  });

  it("buyPolicy: charges tier-specific premium, records policy, blocks duplicates", async () => {
    const departure = (await now()) + 3600n; // +1h
    const flightHash = ethers.keccak256(ethers.toUtf8Bytes("SQ 632 2025-11-01"));
    
    // Test with Gold tier
    const tier = 2; // PolicyTier.Gold = 2
    const tierConfig = TIER_CONFIGS.Gold;
    const premium = quotePremium(tierConfig.payout, tierConfig.probBps, tierConfig.marginBps, tierConfig.multiplierBps);

    await (await pyusd.connect(user).approve(await manager.getAddress(), premium)).wait();

    const buyPolicyReceipt = await (await manager.connect(user).buyPolicy({ flightHash, departureTime: Number(departure) }, tier)).wait();
    const policyPurchasedLog = buyPolicyReceipt!.logs.find((log: any) => log.fragment?.name === "PolicyPurchased");
    const policyId = policyPurchasedLog!.args!.id as bigint;

    const policy = await manager.policies(policyId);
    expect(policy.holder).to.equal(user.address);
    expect(policy.status).to.equal(1); // Active
    expect(policy.premium).to.equal(premium);
    expect(policy.payout).to.equal(tierConfig.payout);
    expect(policy.tier).to.equal(tier);
    expect(policy.thresholdMinutes).to.equal(Number(tierConfig.thresholdMinutes));

    // Duplicate check
    await (await pyusd.connect(user).approve(await manager.getAddress(), premium)).wait();
    await expect(
      manager.connect(user).buyPolicy({ flightHash, departureTime: Number(departure) }, tier)
    ).to.be.revertedWith("User already insured for this flight");
  });

  it("requestVerification: only holder, within [departure, expiry]", async () => {
    const departure = (await now()) + 3600n;
    const flightHash = ethers.keccak256(ethers.toUtf8Bytes("GA 88|2025-12-12"));
    const tier = 0; // PolicyTier.Basic = 0
    const tierConfig = TIER_CONFIGS.Basic;
    const premium = quotePremium(tierConfig.payout, tierConfig.probBps, tierConfig.marginBps, tierConfig.multiplierBps);

    await (await pyusd.connect(user).approve(await manager.getAddress(), premium)).wait();
    const buyPolicyReceipt = await (await manager.connect(user).buyPolicy({ flightHash, departureTime: Number(departure) }, tier)).wait();
    const policyId = buyPolicyReceipt!.logs.find((log: any) => log.fragment?.name === "PolicyPurchased")!.args!.id as bigint;

    await expect(manager.connect(user).requestVerification(Number(policyId), []))
      .to.be.revertedWith("Too early");

    await increase(3700n);
    await increase(EXPIRY_WINDOW);
    await expect(manager.connect(user).requestVerification(Number(policyId), []))
      .to.be.revertedWith("Expired window");
  });

  it("requestVerification: succeeds exactly at departure boundary", async () => {
    const departure = (await now()) + 3600n; // +1h
    const flightHash = ethers.keccak256(ethers.toUtf8Bytes("UA 100|2025-12-24"));
    const tier = 1; // PolicyTier.Silver = 1
    const tierConfig = TIER_CONFIGS.Silver;
    const premium = quotePremium(tierConfig.payout, tierConfig.probBps, tierConfig.marginBps, tierConfig.multiplierBps);

    await (await pyusd.connect(user).approve(await manager.getAddress(), premium)).wait();
    const buyPolicyReceipt = await (await manager.connect(user).buyPolicy({ flightHash, departureTime: Number(departure) }, tier)).wait();
    const policyId = buyPolicyReceipt!.logs.find((log: any) => log.fragment?.name === "PolicyPurchased")!.args!.id as bigint;

    const policy = await manager.policies(policyId);
    await setTime(BigInt(policy.departureTime));
    console.log("policy.departureTime", policy.departureTime);
    console.log("policy.expiry", policy.expiry);
    console.log("current time", await now());

    const verificationReceipt = await (await manager.connect(user).requestVerification(Number(policyId), [])).wait();
    const oracleRequestedLog = verificationReceipt!.logs.find((log: any) => log.fragment?.name === "OracleRequested");
    expect(oracleRequestedLog).to.not.equal(undefined);
  });

  it("requestVerification: succeeds exactly at expiry boundary", async () => {
    const departure = (await now()) + 1800n; // +30m
    const flightHash = ethers.keccak256(ethers.toUtf8Bytes("BA 9|2025-12-31"));
    const tier = 3; // PolicyTier.Platinum = 3
    const tierConfig = TIER_CONFIGS.Platinum;
    const premium = quotePremium(tierConfig.payout, tierConfig.probBps, tierConfig.marginBps, tierConfig.multiplierBps);

    await (await pyusd.connect(user).approve(await manager.getAddress(), premium)).wait();
    const buyPolicyReceipt = await (await manager.connect(user).buyPolicy({ flightHash, departureTime: Number(departure) }, tier)).wait();
    const policyId = buyPolicyReceipt!.logs.find((log: any) => log.fragment?.name === "PolicyPurchased")!.args!.id as bigint;

    const policy = await manager.policies(policyId);
    await setTime(BigInt(policy.expiry));
    console.log("policy.expiry", policy.expiry);
    console.log("current time", await now());

    const verificationReceipt = await (await manager.connect(user).requestVerification(Number(policyId), [])).wait();
    const oracleRequestedLog = verificationReceipt!.logs.find((log: any) => log.fragment?.name === "OracleRequested");
    expect(oracleRequestedLog).to.not.equal(undefined);
  });

  it("fulfill: pays out when (occurred && delay >= tier threshold)", async () => {
    const departure = (await now()) + 60n;
    const flightHash = ethers.keccak256(ethers.toUtf8Bytes("JL 711|2025-10-20"));
    const tier = 2; // PolicyTier.Gold = 2
    const tierConfig = TIER_CONFIGS.Gold;
    const premium = quotePremium(tierConfig.payout, tierConfig.probBps, tierConfig.marginBps, tierConfig.multiplierBps);

    await (await pyusd.connect(user).approve(await manager.getAddress(), premium)).wait();
    const buyPolicyReceipt = await (await manager.connect(user).buyPolicy({ flightHash, departureTime: Number(departure) }, tier)).wait();
    const policyId = buyPolicyReceipt!.logs.find((log: any) => log.fragment?.name === "PolicyPurchased")!.args!.id as bigint;

    await increase(120n);

    const verificationReceipt = await (await manager.connect(user).requestVerification(Number(policyId), [])).wait();
    const oracleRequestedLog = verificationReceipt!.logs.find((log: any) => log.fragment?.name === "OracleRequested");
    const requestId = oracleRequestedLog!.args!.requestId as string;

    const threshold = tierConfig.thresholdMinutes; // Use tier-specific threshold

    const userBalanceBefore = await pyusd.balanceOf(user.address);
    const managerBalanceBefore = await pyusd.balanceOf(await manager.getAddress());

    // Call your router as owner (onlyOwner)
    await (await router.connect(owner).simulateFulfill(
      await manager.getAddress(),
      requestId,
      true,                   // occurred
      Number(threshold)       // delayMinutes >= threshold
    )).wait();

    const policy = await manager.policies(policyId);
    expect(policy.status).to.equal(3); // PaidOut

    const userBalanceAfter = await pyusd.balanceOf(user.address);
    const managerBalanceAfter = await pyusd.balanceOf(await manager.getAddress());
    expect(userBalanceAfter - userBalanceBefore).to.equal(tierConfig.payout);
    expect(managerBalanceBefore - managerBalanceAfter).to.equal(tierConfig.payout);
  });

  it("fulfill: stays Active when delay < tier threshold (no payout)", async () => {
    const departure = (await now()) + 60n;
    const flightHash = ethers.keccak256(ethers.toUtf8Bytes("SQ 12|2025-10-21"));
    const tier = 0; // PolicyTier.Basic = 0
    const tierConfig = TIER_CONFIGS.Basic;
    const premium = quotePremium(tierConfig.payout, tierConfig.probBps, tierConfig.marginBps, tierConfig.multiplierBps);

    await (await pyusd.connect(user).approve(await manager.getAddress(), premium)).wait();
    const buyPolicyReceipt = await (await manager.connect(user).buyPolicy({ flightHash, departureTime: Number(departure) }, tier)).wait();
    const policyId = buyPolicyReceipt!.logs.find((log: any) => log.fragment?.name === "PolicyPurchased")!.args!.id as bigint;

    await increase(120n);

    const verificationReceipt = await (await manager.connect(user).requestVerification(Number(policyId), [])).wait();
    const requestId = verificationReceipt!.logs.find((log: any) => log.fragment?.name === "OracleRequested")!.args!.requestId as string;

    await (await router.connect(owner).simulateFulfill(
      await manager.getAddress(),
      requestId,
      true,     // occurred
      30        // delay < threshold (Basic tier threshold is 240 minutes)
    )).wait();

    const policy = await manager.policies(policyId);
    expect(policy.status).to.equal(1); // Active
  });

  it("expire(): moves Active → Expired after window", async () => {
    const departure = (await now()) + 60n;
    const flightHash = ethers.keccak256(ethers.toUtf8Bytes("NH 8|2025-10-22"));
    const tier = 1; // PolicyTier.Silver = 1
    const tierConfig = TIER_CONFIGS.Silver;
    const premium = quotePremium(tierConfig.payout, tierConfig.probBps, tierConfig.marginBps, tierConfig.multiplierBps);

    await (await pyusd.connect(user).approve(await manager.getAddress(), premium)).wait();
    const buyPolicyReceipt = await (await manager.connect(user).buyPolicy({ flightHash, departureTime: Number(departure) }, tier)).wait();
    const policyId = buyPolicyReceipt!.logs.find((log: any) => log.fragment?.name === "PolicyPurchased")!.args!.id as bigint;

    await increase(60n + EXPIRY_WINDOW + 1n);

    await expect(manager.expire(Number(policyId)))
      .to.emit(manager, "PolicyExpired")
      .withArgs(policyId);

    const policy = await manager.policies(policyId);
    expect(policy.status).to.equal(4); // Expired
  });

  it("admin setters: tier config & functions config + guards", async () => {
    // Test tier config setters
    await expect(manager.connect(user).setTierConfig(0, 1000n * ONE, 10000, 240, 3000, 500, true))
      .to.be.revertedWith("Only callable by owner");
    
    // Test validation
    await expect(manager.setTierConfig(0, 0, 10000, 240, 3000, 500, true))
      .to.be.revertedWith("Base payout must be > 0");
    await expect(manager.setTierConfig(0, 1000n * ONE, 0, 240, 3000, 500, true))
      .to.be.revertedWith("Premium multiplier out of range");
    await expect(manager.setTierConfig(0, 1000n * ONE, 10000, 29, 3000, 500, true))
      .to.be.revertedWith("Threshold out of range");
    await expect(manager.setTierConfig(0, 1000n * ONE, 10000, 240, 0, 500, true))
      .to.be.revertedWith("probBps out of range");
    await expect(manager.setTierConfig(0, 1000n * ONE, 10000, 240, 3000, 0, true))
      .to.be.revertedWith("marginBps out of range");

    // Test successful tier config update
    await expect(manager.setTierConfig(0, 2000n * ONE, 15000, 180, 3500, 600, true))
      .to.emit(manager, "TierConfigUpdated")
      .withArgs(0, 2000n * ONE, 15000, 180, 3500, 600, true);

    // Test functions config
    await expect(manager.connect(user).setFunctionsConfig(7, 400_000, ethers.encodeBytes32String("DON-LOCAL")))
      .to.be.revertedWith("Only callable by owner");
    await manager.setFunctionsConfig(7, 400_000, ethers.encodeBytes32String("DON-LOCAL"));
    expect(await manager.subscriptionId()).to.equal(7);
    expect(await manager.fulfillGasLimit()).to.equal(400_000);
    expect(await manager.donID()).to.equal(ethers.encodeBytes32String("DON-LOCAL"));
  });

  it("expiry window setter has bounds", async () => {
    await expect(manager.setExpiryWindow(3599)).to.be.revertedWith("expiryWindow out of range");
    await expect(manager.setExpiryWindow(14 * 24 * 60 * 60 + 1)).to.be.revertedWith("expiryWindow out of range");
    await manager.setExpiryWindow(2 * 60 * 60);
    expect(await manager.expiryWindow()).to.equal(2 * 60 * 60);
  });

  it("tier pricing: different tiers have different pricing", async () => {
    // Test getTierPricing for different tiers
    const [basicPremium, basicPayout, basicThreshold] = await manager.getTierPricing(0);
    const [platinumPremium, platinumPayout, platinumThreshold] = await manager.getTierPricing(3);

    // Platinum should have higher payout and premium than Basic
    expect(platinumPayout).to.be.greaterThan(basicPayout);
    expect(platinumPremium).to.be.greaterThan(basicPremium);
    expect(platinumThreshold).to.be.lessThan(basicThreshold); // Platinum has shorter threshold
  });

  it("tier progression: all tiers follow proper progression", async () => {
    // Get pricing for all tiers
    const [basicPremium, basicPayout, basicThreshold] = await manager.getTierPricing(0);
    const [silverPremium, silverPayout, silverThreshold] = await manager.getTierPricing(1);
    const [goldPremium, goldPayout, goldThreshold] = await manager.getTierPricing(2);
    const [platinumPremium, platinumPayout, platinumThreshold] = await manager.getTierPricing(3);

    // Payout progression: Basic < Silver < Gold < Platinum
    expect(silverPayout).to.be.greaterThan(basicPayout);
    expect(goldPayout).to.be.greaterThan(silverPayout);
    expect(platinumPayout).to.be.greaterThan(goldPayout);

    // Premium progression: Basic < Silver < Gold < Platinum
    expect(silverPremium).to.be.greaterThan(basicPremium);
    expect(goldPremium).to.be.greaterThan(silverPremium);
    expect(platinumPremium).to.be.greaterThan(goldPremium);

    // Threshold progression: Basic > Silver > Gold > Platinum (shorter thresholds for higher tiers)
    expect(silverThreshold).to.be.lessThan(basicThreshold);
    expect(goldThreshold).to.be.lessThan(silverThreshold);
    expect(platinumThreshold).to.be.lessThan(goldThreshold);

    // Verify specific values match our TIER_CONFIGS
    expect(basicPayout).to.equal(TIER_CONFIGS.Basic.payout);
    expect(silverPayout).to.equal(TIER_CONFIGS.Silver.payout);
    expect(goldPayout).to.equal(TIER_CONFIGS.Gold.payout);
    expect(platinumPayout).to.equal(TIER_CONFIGS.Platinum.payout);

    expect(basicThreshold).to.equal(Number(TIER_CONFIGS.Basic.thresholdMinutes));
    expect(silverThreshold).to.equal(Number(TIER_CONFIGS.Silver.thresholdMinutes));
    expect(goldThreshold).to.equal(Number(TIER_CONFIGS.Gold.thresholdMinutes));
    expect(platinumThreshold).to.equal(Number(TIER_CONFIGS.Platinum.thresholdMinutes));
  });

  it("buyPolicy: works with all tier types", async () => {
    const departure = (await now()) + 3600n; // +1h
    
    // Test all tiers
    const tiers = [
      { tier: 0, name: "Basic", config: TIER_CONFIGS.Basic },
      { tier: 1, name: "Silver", config: TIER_CONFIGS.Silver },
      { tier: 2, name: "Gold", config: TIER_CONFIGS.Gold },
      { tier: 3, name: "Platinum", config: TIER_CONFIGS.Platinum }
    ];

    for (const { tier, name, config } of tiers) {
      const flightHash = ethers.keccak256(ethers.toUtf8Bytes(`${name} Flight 123`));
      const premium = quotePremium(config.payout, config.probBps, config.marginBps, config.multiplierBps);

      await (await pyusd.connect(user).approve(await manager.getAddress(), premium)).wait();

      const buyPolicyReceipt = await (await manager.connect(user).buyPolicy({ flightHash, departureTime: Number(departure) }, tier)).wait();
      const policyPurchasedLog = buyPolicyReceipt!.logs.find((log: any) => log.fragment?.name === "PolicyPurchased");
      const policyId = policyPurchasedLog!.args!.id as bigint;

      const policy = await manager.policies(policyId);
      expect(policy.holder).to.equal(user.address);
      expect(policy.status).to.equal(1); // Active
      expect(policy.premium).to.equal(premium);
      expect(policy.payout).to.equal(config.payout);
      expect(policy.tier).to.equal(tier);
      expect(policy.thresholdMinutes).to.equal(Number(config.thresholdMinutes));

      console.log(`${name} tier: Premium=${premium}, Payout=${config.payout}, Threshold=${config.thresholdMinutes}min`);
    }
  });
});
