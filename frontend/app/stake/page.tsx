"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useChainId } from "wagmi";
import { PackageSelector } from "@/components/staking/package-selector";
import { StakeModal } from "@/components/staking/stake-modal";
import { UserStakeCard } from "@/components/staking/user-stake-card";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { CONTRACTS } from "@/lib/contracts";
import { PackageManagerABI } from "@/lib/abis";
import { Wallet, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function StakePage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const contractAddress = chainId === 11155111 
    ? CONTRACTS.sepolia.packageManager 
    : "0x";

  // Get all packages
  const { data: packageIds } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: PackageManagerABI,
    functionName: "getAllPackages",
  });

  // Get package details
  const { data: package0 } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: PackageManagerABI,
    functionName: "getPackageInfo",
    args: [0n],
  });

  const { data: package1 } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: PackageManagerABI,
    functionName: "getPackageInfo",
    args: [1n],
  });

  const { data: package2 } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: PackageManagerABI,
    functionName: "getPackageInfo",
    args: [2n],
  });

  const packages = [package0, package1, package2].filter(Boolean);

  const handleSelectPackage = (packageId: number) => {
    const pkg = packages[packageId];
    if (pkg) {
      setSelectedPackage(pkg);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPackage(null);
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Back Button */}
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Stake & Earn
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Stake your USDC on Aave V3, earn competitive yield, and get free flight insurance policies.
            All secured by smart contracts.
          </p>
        </div>

        {/* Connection Required */}
        {!isConnected ? (
          <div className="max-w-md mx-auto">
            <div className="rounded-lg border bg-card p-8 text-center space-y-4">
              <Wallet className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">Connect Your Wallet</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Please connect your wallet to view and manage your staking positions
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            {/* User's Current Stake */}
            {address && (
              <section>
                <h2 className="text-2xl font-bold mb-6">Your Stake</h2>
                <UserStakeCard 
                  address={address} 
                  chainId={chainId}
                />
              </section>
            )}

            {/* Available Packages */}
            <section>
              <div className="mb-6">
                <h2 className="text-2xl font-bold">Choose Your Package</h2>
                <p className="text-muted-foreground">
                  Select a staking tier that matches your goals. Higher stakes = more free insurance policies.
                </p>
              </div>

              <PackageSelector
                packages={packages as any[]}
                onSelectPackage={handleSelectPackage}
                isLoading={!packageIds}
              />
            </section>

            {/* How It Works */}
            <section className="rounded-lg border bg-muted/30 p-8">
              <h3 className="text-xl font-bold mb-6">How Staking Works</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <div className="text-3xl mb-3">💰</div>
                  <h4 className="font-semibold mb-2">1. Stake USDC</h4>
                  <p className="text-sm text-muted-foreground">
                    Choose a package and stake your USDC. Your funds are deposited into Aave V3 to generate yield.
                  </p>
                </div>
                <div>
                  <div className="text-3xl mb-3">📈</div>
                  <h4 className="font-semibold mb-2">2. Earn Yield</h4>
                  <p className="text-sm text-muted-foreground">
                    Earn 3.5% APY on your staked USDC while getting free flight insurance policies based on your tier.
                  </p>
                </div>
                <div>
                  <div className="text-3xl mb-3">🔓</div>
                  <h4 className="font-semibold mb-2">3. Unstake Anytime</h4>
                  <p className="text-sm text-muted-foreground">
                    After the lock period ends, unstake to get your principal plus all earned yield back.
                  </p>
                </div>
              </div>
            </section>

            {/* Benefits */}
            <section className="grid md:grid-cols-2 gap-6">
              <div className="rounded-lg border p-6">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <span className="text-2xl">🔒</span>
                  Secure & Transparent
                </h4>
                <p className="text-sm text-muted-foreground">
                  Your funds are secured by audited smart contracts. All transactions are transparent and verifiable on-chain.
                </p>
              </div>
              <div className="rounded-lg border p-6">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <span className="text-2xl">⚡</span>
                  Real DeFi Yield
                </h4>
                <p className="text-sm text-muted-foreground">
                  Earn real yield from Aave V3 protocol. Your USDC is lent to borrowers, generating sustainable returns.
                </p>
              </div>
              <div className="rounded-lg border p-6">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <span className="text-2xl">✈️</span>
                  Free Insurance
                </h4>
                <p className="text-sm text-muted-foreground">
                  Get free flight delay insurance policies. No need to pay premiums - it's included with your stake!
                </p>
              </div>
              <div className="rounded-lg border p-6">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <span className="text-2xl">💎</span>
                  Non-Custodial
                </h4>
                <p className="text-sm text-muted-foreground">
                  You maintain full control. Your funds never leave your wallet's control until you explicitly stake them.
                </p>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Stake Modal */}
      {selectedPackage && (
        <StakeModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          selectedPackage={selectedPackage}
          chainId={chainId}
        />
      )}
    </main>
  );
}

