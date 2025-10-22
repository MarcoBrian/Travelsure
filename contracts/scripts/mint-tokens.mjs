async function main() {
  // Dynamic import for hardhat
  const hre = await import("hardhat");
  
  const [signer] = await hre.ethers.getSigners();
  console.log("Minting tokens for:", signer.address);

  // Contract addresses
  const USDC_ADDRESS = "0x2Bd1B04eE81D7235bE3f0a665e55Ac2CA89c923E";
  const PYUSD_ADDRESS = "0x792B2b3713e71511f118BcAbFac7DfCdfd61916d";

  // Get contracts
  const usdc = await hre.ethers.getContractAt("MockUSDC", USDC_ADDRESS);
  const pyusd = await hre.ethers.getContractAt("PYUSDMock", PYUSD_ADDRESS);

  // Mint USDC
  console.log("\n💵 Minting USDC...");
  const usdcTx = await usdc.mint(signer.address, hre.ethers.parseUnits("10000", 6));
  await usdcTx.wait();
  console.log("✅ Minted 10,000 USDC");

  // Mint PYUSD
  console.log("\n💵 Minting PYUSD...");
  const pyusdTx = await pyusd.mint(signer.address, hre.ethers.parseUnits("10000", 6));
  await pyusdTx.wait();
  console.log("✅ Minted 10,000 PYUSD");

  // Check balances
  console.log("\n📊 Final Balances:");
  const usdcBalance = await usdc.balanceOf(signer.address);
  const pyusdBalance = await pyusd.balanceOf(signer.address);
  console.log("USDC:  ", hre.ethers.formatUnits(usdcBalance, 6));
  console.log("PYUSD: ", hre.ethers.formatUnits(pyusdBalance, 6));

  console.log("\n🎉 All done! You're ready to stake!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });



