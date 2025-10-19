import { network } from "hardhat";
// Using hardcoded addresses; no fs/path/url needed
import { PolicyManager__factory, PYUSDMock__factory } from "../types/ethers-contracts/factories/index.js";
import { MockFunctionsRouter__factory } from "../types/ethers-contracts/factories/MockFunctionsRouter.sol/index.js";

async function main() {
  const { ethers } = await network.connect();
  const [owner] = await ethers.getSigners();

  // Default values (edit these as you like for quick local runs)
  const DEFAULT_POLICY_ID = "1"; // e.g. first purchased policy id
  const DEFAULT_HOLDER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // Hardhat default account[0]
  const DEFAULT_OCCURRED = "true"; // simulate a payout scenario by default
  const DEFAULT_DELAY: string | undefined = undefined; // if undefined, uses THRESHOLD_MINUTES

  // Hardcoded parameters
  const policyId = BigInt(DEFAULT_POLICY_ID);
  const holder = DEFAULT_HOLDER;
  const occurred = DEFAULT_OCCURRED === "true";
  let delayMinutesOverride: number | undefined = DEFAULT_DELAY ? Number(DEFAULT_DELAY) : undefined;

  // Hardcoded local deployment addresses
  const routerAddress: string = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // PolicyStack#MockFunctionsRouter
  const pyusdAddress: string = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; // PolicyStack#PYUSDMock
  const managerAddress: string = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"; // PolicyStack#PolicyManager

  const router = MockFunctionsRouter__factory.connect(routerAddress, owner);
  const pyusd = PYUSDMock__factory.connect(pyusdAddress, owner);
  const manager = PolicyManager__factory.connect(managerAddress, owner);

  // Sanity: verify contracts exist and (optionally) router owner
  const [routerCode, managerCode, pyusdCode] = await Promise.all([
    ethers.provider.getCode(routerAddress),
    ethers.provider.getCode(managerAddress),
    ethers.provider.getCode(pyusdAddress),
  ]);
  if (routerCode === "0x" || managerCode === "0x" || pyusdCode === "0x") {
    throw new Error("One or more hardcoded addresses have no contract code on this node.");
  }
  // Ensure we invoke router as its owner; impersonate if needed
  let routerOwner = owner;
  try {
    const rOwner = await (router as any).owner();
    if (typeof rOwner === "string" && rOwner.toLowerCase() !== owner.address.toLowerCase()) {
      await ethers.provider.send("hardhat_impersonateAccount", [rOwner]);
      routerOwner = await ethers.getSigner(rOwner);
    }
  } catch {
    // owner() may not exist; ignore
  }

  // Ensure we have a block to read
  let latestBlock = await ethers.provider.getBlock("latest");
  if (!latestBlock) {
    await ethers.provider.send("evm_mine", []);
    latestBlock = await ethers.provider.getBlock("latest");
  }
  if (!latestBlock) throw new Error("Could not get latest block");

  // Ensure manager has enough PYUSD to pay out on success
  const payoutAmount = await manager.payoutAmount();
  const managerAddr = await manager.getAddress();
  const managerBalBefore = await pyusd.balanceOf(managerAddr);
  if (managerBalBefore < payoutAmount) {
    await (await pyusd.mint(managerAddr, payoutAmount)).wait();
  }

  // Prepare holder signer (use given address; impersonate if needed)
  let holderSigner: any;
  try {
    holderSigner = await ethers.getSigner(holder);
  } catch {
    await ethers.provider.send("hardhat_impersonateAccount", [holder]);
    holderSigner = await ethers.getSigner(holder);
  }

  // Ensure holder has ETH for gas
  const holderEth = await ethers.provider.getBalance(holder);
  if (holderEth === 0n) {
    await (await owner.sendTransaction({ to: holder, value: ethers.parseEther("1") })).wait();
  }

  // Ensure we are within verification window for the given policy
  const policy = await manager.policies(policyId);
  if (policy.holder.toLowerCase() !== holder.toLowerCase()) {
    throw new Error(`Policy ${policyId.toString()} holder mismatch. onChain=${policy.holder} provided=${holder}`);
  }
  const nowBlock = await ethers.provider.getBlock("latest");
  const nowTs = BigInt(nowBlock?.timestamp ?? 0);
  if (nowTs < policy.departureTime) {
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(policy.departureTime)]);
    await ethers.provider.send("evm_mine", []);
  }
  const afterBlock = await ethers.provider.getBlock("latest");
  const afterTs = BigInt(afterBlock?.timestamp ?? 0);
  if (afterTs > policy.expiry) {
    throw new Error(`Policy ${policyId.toString()} expired. expiry=${policy.expiry.toString()} now=${afterTs.toString()}`);
  }


  const tx = await manager.connect(holderSigner).requestVerification(Number(policyId), []);
  const receipt = await tx.wait();
  const events = await manager.queryFilter(
    manager.filters.OracleRequested(),
    receipt!.blockNumber,
    receipt!.blockNumber
  );
  const oracleRequested = events.find((e) => e.args.policyId === policyId);
  if (!oracleRequested) throw new Error("OracleRequested event not found in block");
  const requestId: string = oracleRequested.args.requestId;

  const defaultThreshold: number = Number(await manager.THRESHOLD_MINUTES());
  const delayMinutes = delayMinutesOverride ?? defaultThreshold;

  const userBalanceBefore = await pyusd.balanceOf(holder);
  const managerBalanceBefore = await pyusd.balanceOf(await manager.getAddress());

  // Preflight to surface revert reasons (ethers v6 staticCall pattern)
  await router.connect(routerOwner).simulateFulfill.staticCall(
    await manager.getAddress(),
    requestId,
    occurred,
    delayMinutes
  );

  await (
    await router.connect(routerOwner).simulateFulfill(
      await manager.getAddress(),
      requestId,
      occurred,
      delayMinutes
    )
  ).wait();

  const finalPolicy = await manager.policies(policyId);
  const userBalanceAfter = await pyusd.balanceOf(holder);
  const managerBalanceAfter = await pyusd.balanceOf(await manager.getAddress());

  console.log("Policy ID:", policyId.toString());
  console.log("Policy status (3 = PaidOut):", finalPolicy.status);
  console.log("User payout delta:", (userBalanceAfter - userBalanceBefore).toString());
  console.log("Manager payout delta:", (managerBalanceBefore - managerBalanceAfter).toString());
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });


