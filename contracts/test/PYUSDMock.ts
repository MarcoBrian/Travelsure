// test/pyusd.mock.test.ts
import { describe, it, before } from "mocha";
import { expect } from "chai";
import { network } from "hardhat";

describe("PYUSDMock (ethers v6 + mocha)", () => {
  let ethers: any;
  let owner: any, alice: any, bob: any;
  const DECIMALS = 6n;
  const ONE = 10n ** DECIMALS;
  const INITIAL_SUPPLY = 1_000_000n * ONE; // 1,000,000 * 10^6 = 1e12

  before(async () => {
    ({ ethers } = await network.connect()); // HH v3 pattern
    [owner, alice, bob] = await ethers.getSigners();
  });

  async function deploy() {
    const F = await ethers.getContractFactory("PYUSDMock", owner);
    const token = await F.deploy();
    await token.waitForDeployment();
    return token;
  }

  it("deploys with correct metadata and initial supply", async () => {
    const token = await deploy();

    expect(await token.name()).to.equal("Mock PYUSD");
    expect(await token.symbol()).to.equal("PYUSD");
    // uint8 in ethers v6 -> number
    expect(await token.decimals()).to.equal(6);

    const total = await token.totalSupply();
    const ownerBal = await token.balanceOf(owner.address);

    expect(total).to.equal(INITIAL_SUPPLY);
    expect(ownerBal).to.equal(INITIAL_SUPPLY);
  });

  it("transfers with 6-decimals math", async () => {
    const token = await deploy();

    const amount = 123_456_789n; // we’ll compose using integers
    const amt = 123_456_789n; // 123.456789 * 1e6

    // owner -> alice
    await (await token.transfer(alice.address, amt)).wait();

    expect(await token.balanceOf(alice.address)).to.equal(amt);
    expect(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY - amt);
  });

  it("mints (anyone can call in this mock) and updates totals", async () => {
    const token = await deploy();

    const mintAmt = 2_500_000n; // 2.5 tokens in 6-decimals? No—this is 2.5 with 6dp -> 2_500_000
    await (await token.connect(alice).mint(alice.address, mintAmt)).wait();

    expect(await token.balanceOf(alice.address)).to.equal(mintAmt);
    expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY + mintAmt);
  });

  it("burns from arbitrary address (mock allows it) and updates totals", async () => {
    const token = await deploy();

    // send some to Alice first
    const amt = 1_000_000n; // 1.0 token (6 dp)
    await (await token.transfer(alice.address, amt)).wait();

    // Bob (not Alice) burns Alice's balance — this mock permits arbitrary burns
    await (await token.connect(bob).burn(alice.address, amt)).wait();

    expect(await token.balanceOf(alice.address)).to.equal(0n);
    expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY - amt);
  });

  it("emits standard Transfer events on mint/transfer/burn", async () => {
    const token = await deploy();

    // mint to Alice
    const mintAmt = 10_000n;
    await expect(token.mint(alice.address, mintAmt))
      .to.emit(token, "Transfer")
      .withArgs(ethers.ZeroAddress, alice.address, mintAmt);

    // transfer Alice -> Bob
    await expect(token.connect(alice).transfer(bob.address, mintAmt))
      .to.emit(token, "Transfer")
      .withArgs(alice.address, bob.address, mintAmt);

    // burn from Bob by Owner (arbitrary burn allowed)
    await expect(token.burn(bob.address, mintAmt))
      .to.emit(token, "Transfer")
      .withArgs(bob.address, ethers.ZeroAddress, mintAmt);
  });
});
