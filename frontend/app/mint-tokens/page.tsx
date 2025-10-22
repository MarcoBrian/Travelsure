"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { CONTRACTS, PYUSDMockABI } from "@/lib/contracts";
import { MockUSDCABI } from "@/lib/abis";
import { formatUnits, parseUnits } from "viem";

export default function MintTokensPage() {
  const { address, isConnected, chainId } = useAccount();
  const [usdcAmount, setUsdcAmount] = useState("10000");
  const [pyusdAmount, setPyusdAmount] = useState("10000");

  const networkName = chainId === 11155111 ? "sepolia" : "localhost";
  const contracts = CONTRACTS[networkName as keyof typeof CONTRACTS];
  
  const usdcAddress = "usdc" in contracts ? contracts.usdc : undefined;
  const pyusdAddress = contracts.pyusd;

  // Read balances
  const { data: usdcBalance } = useReadContract({
    address: usdcAddress as `0x${string}`,
    abi: MockUSDCABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  const { data: pyusdBalance } = useReadContract({
    address: pyusdAddress as `0x${string}`,
    abi: PYUSDMockABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // Mint functions
  const { writeContract: mintUsdc, isPending: isUsdcPending } = useWriteContract();
  const { writeContract: mintPyusd, isPending: isPyusdPending } = useWriteContract();

  const handleMintUsdc = () => {
    if (!usdcAddress || !address) return;
    mintUsdc({
      address: usdcAddress as `0x${string}`,
      abi: MockUSDCABI,
      functionName: "mint",
      args: [address, parseUnits(usdcAmount, 6)],
    });
  };

  const handleMintPyusd = () => {
    if (!address) return;
    mintPyusd({
      address: pyusdAddress as `0x${string}`,
      abi: PYUSDMockABI,
      functionName: "mint",
      args: [address, parseUnits(pyusdAmount, 6)],
    });
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">🪙 Mint Test Tokens</h1>
        <ConnectButton />
      </div>
    );
  }

  if (!usdcAddress) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">⚠️ Switch to Sepolia</h1>
        <p className="mb-4">USDC is only available on Sepolia testnet.</p>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">🪙 Mint Test Tokens</h1>
      <p className="text-gray-600 mb-6">Get free USDC and PYUSD for testing</p>
      
      <div className="mb-6">
        <ConnectButton />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* USDC */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-2">💵 Mock USDC</h2>
          <p className="text-sm text-gray-600 mb-4">
            Balance: {usdcBalance ? formatUnits(usdcBalance as bigint, 6) : "0"} USDC
          </p>
          
          <input
            type="number"
            value={usdcAmount}
            onChange={(e) => setUsdcAmount(e.target.value)}
            className="w-full p-2 border rounded mb-3"
            placeholder="10000"
          />
          
          <div className="flex gap-2 mb-3">
            <button onClick={() => setUsdcAmount("1000")} className="px-3 py-1 text-sm border rounded">1K</button>
            <button onClick={() => setUsdcAmount("5000")} className="px-3 py-1 text-sm border rounded">5K</button>
            <button onClick={() => setUsdcAmount("10000")} className="px-3 py-1 text-sm border rounded">10K</button>
            <button onClick={() => setUsdcAmount("50000")} className="px-3 py-1 text-sm border rounded">50K</button>
          </div>
          
          <button
            onClick={handleMintUsdc}
            disabled={isUsdcPending}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isUsdcPending ? "Minting..." : "Mint USDC"}
          </button>
        </div>

        {/* PYUSD */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-2">💰 Mock PYUSD</h2>
          <p className="text-sm text-gray-600 mb-4">
            Balance: {pyusdBalance ? formatUnits(pyusdBalance as bigint, 6) : "0"} PYUSD
          </p>
          
          <input
            type="number"
            value={pyusdAmount}
            onChange={(e) => setPyusdAmount(e.target.value)}
            className="w-full p-2 border rounded mb-3"
            placeholder="10000"
          />
          
          <div className="flex gap-2 mb-3">
            <button onClick={() => setPyusdAmount("1000")} className="px-3 py-1 text-sm border rounded">1K</button>
            <button onClick={() => setPyusdAmount("5000")} className="px-3 py-1 text-sm border rounded">5K</button>
            <button onClick={() => setPyusdAmount("10000")} className="px-3 py-1 text-sm border rounded">10K</button>
            <button onClick={() => setPyusdAmount("50000")} className="px-3 py-1 text-sm border rounded">50K</button>
          </div>
          
          <button
            onClick={handleMintPyusd}
            disabled={isPyusdPending}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isPyusdPending ? "Minting..." : "Mint PYUSD"}
          </button>
        </div>
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-bold mb-2">📝 Contract Addresses</h3>
        <div className="text-sm space-y-2 font-mono">
          <div>
            <span className="text-gray-600">USDC:</span>
            <br />
            <a 
              href={`https://sepolia.etherscan.io/address/${usdcAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {usdcAddress}
            </a>
          </div>
          <div>
            <span className="text-gray-600">PYUSD:</span>
            <br />
            <a 
              href={`https://sepolia.etherscan.io/address/${pyusdAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {pyusdAddress}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
