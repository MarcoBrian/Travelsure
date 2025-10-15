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
  const DEFAULT_PAYOUT = 500n * ONE;     // set in PolicyManager
  const DEFAULT_PROB_BPS = 3000n;        // 30%
  const DEFAULT_MARGIN_BPS = 500n;       // 5%
  const EXPIRY_WINDOW = 48n * 60n * 60n; // 48h

  const quotePremium = (payout: bigint, probBps: bigint, marginBps: bigint) => {
    const base = (payout * probBps) / 10_000n;
    return (base * (10_000n + marginBps)) / 10_000n;
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

  it("constructor defaults", async () => {
    expect(await manager.PYUSD()).to.equal(await pyusd.getAddress());
    expect(await manager.pyusdDecimals()).to.equal(6);
    expect(await manager.payoutAmount()).to.equal(DEFAULT_PAYOUT);
    expect(await manager.probBps()).to.equal(Number(DEFAULT_PROB_BPS));
    expect(await manager.marginBps()).to.equal(Number(DEFAULT_MARGIN_BPS));
    expect(await manager.THRESHOLD_MINUTES()).to.equal(240);
  });

  it("buyPolicy: charges premium, records policy, blocks duplicates", async () => {
    const departure = (await now()) + 3600n; // +1h
    const flightHash = ethers.keccak256(ethers.toUtf8Bytes("SQ 632 2025-11-01"));
    const premium = quotePremium(DEFAULT_PAYOUT, DEFAULT_PROB_BPS, DEFAULT_MARGIN_BPS);

    await (await pyusd.connect(user).approve(await manager.getAddress(), premium)).wait();

    const buyPolicyReceipt = await (await manager.connect(user).buyPolicy({ flightHash, departureTime: Number(departure) })).wait();
    const policyPurchasedLog = buyPolicyReceipt!.logs.find((log: any) => log.fragment?.name === "PolicyPurchased");
    const policyId = policyPurchasedLog!.args!.id as bigint;

    const policy = await manager.policies(policyId);
    expect(policy.holder).to.equal(user.address);
    expect(policy.status).to.equal(1); // Active
    expect(policy.premium).to.equal(premium);
    expect(policy.payout).to.equal(DEFAULT_PAYOUT);

    // Duplicate check
    await (await pyusd.connect(user).approve(await manager.getAddress(), premium)).wait();
    await expect(
      manager.connect(user).buyPolicy({ flightHash, departureTime: Number(departure) })
    ).to.be.revertedWith("User already insured for this flight");
  });

  it("requestVerification: only holder, within [departure, expiry]", async () => {
    const departure = (await now()) + 3600n;
    const flightHash = ethers.keccak256(ethers.toUtf8Bytes("GA 88|2025-12-12"));
    const premium = quotePremium(DEFAULT_PAYOUT, DEFAULT_PROB_BPS, DEFAULT_MARGIN_BPS);

    await (await pyusd.connect(user).approve(await manager.getAddress(), premium)).wait();
    const buyPolicyReceipt = await (await manager.connect(user).buyPolicy({ flightHash, departureTime: Number(departure) })).wait();
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
    const premium = quotePremium(DEFAULT_PAYOUT, DEFAULT_PROB_BPS, DEFAULT_MARGIN_BPS);

    await (await pyusd.connect(user).approve(await manager.getAddress(), premium)).wait();
    const buyPolicyReceipt = await (await manager.connect(user).buyPolicy({ flightHash, departureTime: Number(departure) })).wait();
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
    const premium = quotePremium(DEFAULT_PAYOUT, DEFAULT_PROB_BPS, DEFAULT_MARGIN_BPS);

    await (await pyusd.connect(user).approve(await manager.getAddress(), premium)).wait();
    const buyPolicyReceipt = await (await manager.connect(user).buyPolicy({ flightHash, departureTime: Number(departure) })).wait();
    const policyId = buyPolicyReceipt!.logs.find((log: any) => log.fragment?.name === "PolicyPurchased")!.args!.id as bigint;

    const policy = await manager.policies(policyId);
    await setTime(BigInt(policy.expiry));
    console.log("policy.expiry", policy.expiry);
    console.log("current time", await now());

    const verificationReceipt = await (await manager.connect(user).requestVerification(Number(policyId), [])).wait();
    const oracleRequestedLog = verificationReceipt!.logs.find((log: any) => log.fragment?.name === "OracleRequested");
    expect(oracleRequestedLog).to.not.equal(undefined);
  });

  it("fulfill: pays out when (occurred && delay >= threshold)", async () => {
    const departure = (await now()) + 60n;
    const flightHash = ethers.keccak256(ethers.toUtf8Bytes("JL 711|2025-10-20"));
    const premium = quotePremium(DEFAULT_PAYOUT, DEFAULT_PROB_BPS, DEFAULT_MARGIN_BPS);

    await (await pyusd.connect(user).approve(await manager.getAddress(), premium)).wait();
    const buyPolicyReceipt = await (await manager.connect(user).buyPolicy({ flightHash, departureTime: Number(departure) })).wait();
    const policyId = buyPolicyReceipt!.logs.find((log: any) => log.fragment?.name === "PolicyPurchased")!.args!.id as bigint;

    await increase(120n);

    const verificationReceipt = await (await manager.connect(user).requestVerification(Number(policyId), [])).wait();
    const oracleRequestedLog = verificationReceipt!.logs.find((log: any) => log.fragment?.name === "OracleRequested");
    const requestId = oracleRequestedLog!.args!.requestId as string;

    const threshold = BigInt(await manager.THRESHOLD_MINUTES());

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
    expect(userBalanceAfter - userBalanceBefore).to.equal(DEFAULT_PAYOUT);
    console.log("userBalanceAfter", userBalanceAfter);
    console.log("userBalanceBefore", userBalanceBefore);
    console.log("DEFAULT_PAYOUT", DEFAULT_PAYOUT);
    console.log("managerBalanceAfter", managerBalanceAfter);
    console.log("managerBalanceBefore", managerBalanceBefore);
    expect(managerBalanceBefore - managerBalanceAfter).to.equal(DEFAULT_PAYOUT);
  });

  it("fulfill: stays Active when delay < threshold (no payout)", async () => {
    const departure = (await now()) + 60n;
    const flightHash = ethers.keccak256(ethers.toUtf8Bytes("SQ 12|2025-10-21"));
    const premium = quotePremium(DEFAULT_PAYOUT, DEFAULT_PROB_BPS, DEFAULT_MARGIN_BPS);

    await (await pyusd.connect(user).approve(await manager.getAddress(), premium)).wait();
    const buyPolicyReceipt = await (await manager.connect(user).buyPolicy({ flightHash, departureTime: Number(departure) })).wait();
    const policyId = buyPolicyReceipt!.logs.find((log: any) => log.fragment?.name === "PolicyPurchased")!.args!.id as bigint;

    await increase(120n);

    const verificationReceipt = await (await manager.connect(user).requestVerification(Number(policyId), [])).wait();
    const requestId = verificationReceipt!.logs.find((log: any) => log.fragment?.name === "OracleRequested")!.args!.requestId as string;

    await (await router.connect(owner).simulateFulfill(
      await manager.getAddress(),
      requestId,
      true,     // occurred
      30        // delay < threshold
    )).wait();

    const policy = await manager.policies(policyId);
    expect(policy.status).to.equal(1); // Active
  });

  it("expire(): moves Active → Expired after window", async () => {
    const departure = (await now()) + 60n;
    const flightHash = ethers.keccak256(ethers.toUtf8Bytes("NH 8|2025-10-22"));
    const premium = quotePremium(DEFAULT_PAYOUT, DEFAULT_PROB_BPS, DEFAULT_MARGIN_BPS);

    await (await pyusd.connect(user).approve(await manager.getAddress(), premium)).wait();
    const buyPolicyReceipt = await (await manager.connect(user).buyPolicy({ flightHash, departureTime: Number(departure) })).wait();
    const policyId = buyPolicyReceipt!.logs.find((log: any) => log.fragment?.name === "PolicyPurchased")!.args!.id as bigint;

    await increase(60n + EXPIRY_WINDOW + 1n);

    await expect(manager.expire(Number(policyId)))
      .to.emit(manager, "PolicyExpired")
      .withArgs(policyId);

    const policy = await manager.policies(policyId);
    expect(policy.status).to.equal(4); // Expired
  });

  it("admin setters: pricing & functions config + guards", async () => {
    await expect(manager.connect(user).setPricing(1000, 200, 1n * ONE))
      .to.be.revertedWith("Only callable by owner");
    await expect(manager.setPricing(0, 200, 1n * ONE)).to.be.revertedWith("probBps out of range");
    await expect(manager.setPricing(1000, 0, 1n * ONE)).to.be.revertedWith("marginBps out of range");
    await expect(manager.setPricing(1000, 200, 0)).to.be.revertedWith("payout must be > 0");

    await expect(manager.setPricing(2500, 300, 1_000n * ONE))
      .to.emit(manager, "PricingUpdated")
      .withArgs(2500, 300, 1_000n * ONE);

    await expect(manager.connect(user).setFunctionsConfig(7, 400_000, ethers.encodeBytes32String("DON-LOCAL")))
      .to.be.revertedWith("Only callable by owner");
    await manager.setFunctionsConfig(7, 400_000, ethers.encodeBytes32String("DON-LOCAL"));
    expect(await manager.subscriptionId()).to.equal(7);
    expect(await manager.fulfillGasLimit()).to.equal(400_000);
    expect(await manager.donID()).to.equal(ethers.encodeBytes32String("DON-LOCAL"));
  });

  it("threshold/expiry setters have bounds", async () => {
    await expect(manager.setExpiryWindow(3599)).to.be.revertedWith("expiryWindow out of range");
    await expect(manager.setExpiryWindow(14 * 24 * 60 * 60 + 1)).to.be.revertedWith("expiryWindow out of range");
    await manager.setExpiryWindow(2 * 60 * 60);
    expect(await manager.expiryWindow()).to.equal(2 * 60 * 60);

    await expect(manager.setThresholdMinutes(29)).to.be.revertedWith("thresholdMinutes out of range");
    await expect(manager.setThresholdMinutes(361)).to.be.revertedWith("thresholdMinutes out of range");
    await manager.setThresholdMinutes(180);
    expect(await manager.THRESHOLD_MINUTES()).to.equal(180);
  });
});
