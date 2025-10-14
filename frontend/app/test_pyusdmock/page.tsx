"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { PYUSDMockABI, PYUSDMockAddress } from "@/lib/contracts";
import { formatUnits, parseUnits } from "viem";

export default function TestPage() {
  const { address, isConnected } = useAccount();
  const [mintAmount, setMintAmount] = useState("");
  const [burnAmount, setBurnAmount] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Read contract data
  const { data: balance } = useReadContract({
    address: PYUSDMockAddress,
    abi: PYUSDMockABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  const { data: name } = useReadContract({
    address: PYUSDMockAddress,
    abi: PYUSDMockABI,
    functionName: "name",
  });

  const { data: symbol } = useReadContract({
    address: PYUSDMockAddress,
    abi: PYUSDMockABI,
    functionName: "symbol",
  });

  const { data: decimals } = useReadContract({
    address: PYUSDMockAddress,
    abi: PYUSDMockABI,
    functionName: "decimals",
  });

  // Write contract functions
  const { writeContract: mint, data: mintHash, isPending: isMintPending } = useWriteContract();
  const { writeContract: burn, data: burnHash, isPending: isBurnPending } = useWriteContract();
  const { writeContract: transfer, data: transferHash, isPending: isTransferPending } = useWriteContract();

  // Wait for transaction receipts
  const { isLoading: isMintConfirming } = useWaitForTransactionReceipt({
    hash: mintHash,
  });

  const { isLoading: isBurnConfirming } = useWaitForTransactionReceipt({
    hash: burnHash,
  });

  const { isLoading: isTransferConfirming } = useWaitForTransactionReceipt({
    hash: transferHash,
  });

  const handleMint = async () => {
    if (!mintAmount || !address) return;
    
    try {
      const amount = parseUnits(mintAmount, decimals || 6);
      await mint({
        address: PYUSDMockAddress,
        abi: PYUSDMockABI,
        functionName: "mint",
        args: [address, amount],
      });
    } catch (error) {
      console.error("Mint error:", error);
    }
  };

  const handleBurn = async () => {
    if (!burnAmount || !address) return;
    
    try {
      const amount = parseUnits(burnAmount, decimals || 6);
      await burn({
        address: PYUSDMockAddress,
        abi: PYUSDMockABI,
        functionName: "burn",
        args: [address, amount],
      });
    } catch (error) {
      console.error("Burn error:", error);
    }
  };

  const handleTransfer = async () => {
    if (!transferAmount || !transferTo || !address) return;
    
    try {
      const amount = parseUnits(transferAmount, decimals || 6);
      await transfer({
        address: PYUSDMockAddress,
        abi: PYUSDMockABI,
        functionName: "transfer",
        args: [transferTo as `0x${string}`, amount],
      });
    } catch (error) {
      console.error("Transfer error:", error);
    }
  };

  const formatBalance = (balance: bigint | undefined) => {
    if (!balance || !decimals) return "0";
    return formatUnits(balance, decimals);
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Rainbow Kit Test Page</h1>
              <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Rainbow Kit Test Page</h1>
            <ConnectButton />
          </div>

          {!isConnected ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">Please connect your wallet to test the contract interactions</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Contract Info */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h2 className="text-lg font-semibold mb-2">Contract Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Contract Address:</p>
                    <p className="font-mono text-sm break-all">{PYUSDMockAddress}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Token Name:</p>
                    <p className="font-semibold">{name || "Loading..."}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Symbol:</p>
                    <p className="font-semibold">{symbol || "Loading..."}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Decimals:</p>
                    <p className="font-semibold">{decimals?.toString() || "Loading..."}</p>
                  </div>
                </div>
              </div>

              {/* Your Balance */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h2 className="text-lg font-semibold mb-2">Your Balance</h2>
                <p className="text-2xl font-bold text-green-600">
                  {formatBalance(balance)} {symbol || "PYUSD"}
                </p>
              </div>

              {/* Mint Tokens */}
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h2 className="text-lg font-semibold mb-4">Mint Tokens</h2>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Amount to mint"
                    value={mintAmount}
                    onChange={(e) => setMintAmount(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleMint}
                    disabled={isMintPending || isMintConfirming || !mintAmount}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isMintPending || isMintConfirming ? "Minting..." : "Mint"}
                  </button>
                </div>
              </div>

              {/* Burn Tokens */}
              <div className="bg-red-50 p-4 rounded-lg">
                <h2 className="text-lg font-semibold mb-4">Burn Tokens</h2>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Amount to burn"
                    value={burnAmount}
                    onChange={(e) => setBurnAmount(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleBurn}
                    disabled={isBurnPending || isBurnConfirming || !burnAmount}
                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isBurnPending || isBurnConfirming ? "Burning..." : "Burn"}
                  </button>
                </div>
              </div>

              {/* Transfer Tokens */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <h2 className="text-lg font-semibold mb-4">Transfer Tokens</h2>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Recipient address (0x...)"
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Amount to transfer"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleTransfer}
                      disabled={isTransferPending || isTransferConfirming || !transferAmount || !transferTo}
                      className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isTransferPending || isTransferConfirming ? "Transferring..." : "Transfer"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Transaction Status */}
              {(mintHash || burnHash || transferHash) && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Transaction Status</h3>
                  {mintHash && (
                    <p className="text-sm text-gray-600">
                      Mint transaction: <span className="font-mono">{mintHash}</span>
                    </p>
                  )}
                  {burnHash && (
                    <p className="text-sm text-gray-600">
                      Burn transaction: <span className="font-mono">{burnHash}</span>
                    </p>
                  )}
                  {transferHash && (
                    <p className="text-sm text-gray-600">
                      Transfer transaction: <span className="font-mono">{transferHash}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 p-4 bg-gray-100 rounded-lg">
            <h3 className="font-semibold mb-2">Instructions:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
              <li>Make sure you have deployed the PYUSDMock contract</li>
              <li>Update the contract address in <code className="bg-gray-200 px-1 rounded">/lib/contracts.ts</code></li>
              <li>Connect your wallet using the button above</li>
              <li>Try minting some tokens to test the connection</li>
              <li>Check your balance and try transferring tokens</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
