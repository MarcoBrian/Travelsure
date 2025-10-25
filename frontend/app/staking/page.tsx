"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useRouter } from "next/navigation";
import { CONTRACTS } from "@/lib/contracts";
import { PYUSDMockABI } from "@/lib/contracts";
import { stakingAbi } from "@/lib/abi/staking";
import { tierNFTAbi } from "@/lib/abi/tierNFT";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

const TIER_NAMES = ["Basic", "Silver", "Gold", "Platinum"];
const TIER_COLORS = ["bg-blue-500", "bg-gray-400", "bg-yellow-500", "bg-purple-600"];

const TIER_CONFIG = [
  { 
    id: 0, 
    name: "Basic", 
    minAmount: 100, 
    icon: "🥉",
    benefits: ["Earn 9% APY", "10% discount shown on insurance"], 
    quarterlyInsurance: null 
  },
  { 
    id: 1, 
    name: "Silver", 
    minAmount: 500, 
    icon: "🥈",
    benefits: ["Earn 9% APY", "FREE insurance", "2 policies per quarter"], 
    quarterlyInsurance: 2 
  },
  { 
    id: 2, 
    name: "Gold", 
    minAmount: 1000, 
    icon: "🥇",
    benefits: ["Earn 9% APY", "FREE insurance", "4 policies per quarter"], 
    quarterlyInsurance: 4 
  },
  { 
    id: 3, 
    name: "Platinum", 
    minAmount: 2000, 
    icon: "💎",
    benefits: ["Earn 9% APY", "FREE insurance", "10 policies per quarter"], 
    quarterlyInsurance: 10 
  }
];

export default function StakingPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [newlyEarnedTier, setNewlyEarnedTier] = useState<number | null>(null);

  // Read user's PYUSD balance
  const { data: pyusdBalance } = useReadContract({
    address: CONTRACTS.localhost.pyusd as `0x${string}`,
    abi: PYUSDMockABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) }
  });

  // Read staking info
  const { data: stakingInfo, refetch: refetchStakingInfo } = useReadContract({
    address: CONTRACTS.localhost.staking as `0x${string}`,
    abi: stakingAbi,
    functionName: "stakingPositions",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) }
  });

  // Read user's tier
  const { data: userTier } = useReadContract({
    address: CONTRACTS.localhost.tierNFT as `0x${string}`,
    abi: tierNFTAbi,
    functionName: "getTier",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) }
  });

  // Read tier info - Remove this section as getTierInfo doesn't exist
  // const { data: tierInfo } = useReadContract({
  //   address: CONTRACTS.localhost.staking,
  //   abi: stakingAbi,
  //   functionName: "getTierInfo",
  //   args: userTier !== undefined ? [userTier] : undefined,
  //   query: { enabled: userTier !== undefined }
  // });

  // Read next tier info - Remove this section
  // const { data: nextTierInfo } = useReadContract({
  //   address: CONTRACTS.localhost.staking,
  //   abi: stakingAbi,
  //   functionName: "getTierInfo",
  //   args: userTier !== undefined ? [userTier + 1n] : undefined,
  //   query: { enabled: userTier !== undefined }
  // });

  // Write contracts
  const { writeContract: writeStaking } = useWriteContract();
  const { writeContract: writePYUSD } = useWriteContract();

  // Transaction receipts
  const { isLoading: isStakePending } = useWaitForTransactionReceipt({
    hash: isStaking ? "0x" : undefined,
  });

  const { isLoading: isUnstakePending } = useWaitForTransactionReceipt({
    hash: isUnstaking ? "0x" : undefined,
  });

  const { isLoading: isClaimPending } = useWaitForTransactionReceipt({
    hash: isClaiming ? "0x" : undefined,
  });

  // Prevent hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Loading...</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  const formatAmount = (amount: bigint) => {
    return Number(amount) / 1e6; // Assuming 6 decimals
  };

  const parseAmount = (amount: string) => {
    return BigInt(Math.floor(parseFloat(amount) * 1e6));
  };

  const calculateTierFromAmount = (amount: number): number => {
    if (amount >= TIER_CONFIG[3].minAmount) return 3; // Platinum
    if (amount >= TIER_CONFIG[2].minAmount) return 2; // Gold
    if (amount >= TIER_CONFIG[1].minAmount) return 1; // Silver
    if (amount >= TIER_CONFIG[0].minAmount) return 0; // Basic
    return 0;
  };

  const handleStake = async () => {
    if (!stakeAmount || !address) return;
    
    try {
      setIsStaking(true);
      
      const stakeAmountParsed = parseAmount(stakeAmount);
      const currentAmount = stakingInfo ? formatAmount(stakingInfo[0] as bigint) : 0;
      const newTotalAmount = currentAmount + parseFloat(stakeAmount);
      const newTier = calculateTierFromAmount(newTotalAmount);
      
      // First approve PYUSD
      await writePYUSD({
        address: CONTRACTS.localhost.pyusd as `0x${string}`,
        abi: PYUSDMockABI,
        functionName: "approve",
        args: [CONTRACTS.localhost.staking as `0x${string}`, stakeAmountParsed],
      });

      // Then stake
      await writeStaking({
        address: CONTRACTS.localhost.staking as `0x${string}`,
        abi: stakingAbi,
        functionName: "stake",
        args: [stakeAmountParsed],
      });

      setStakeAmount("");
      
      // Show success modal if Silver+ tier achieved
      setTimeout(() => {
        refetchStakingInfo();
        if (newTier >= 1) {
          setNewlyEarnedTier(newTier);
          setShowSuccessModal(true);
        }
        setIsStaking(false);
      }, 3000);
    } catch (error) {
      console.error("Staking error:", error);
      setIsStaking(false);
    }
  };

  const handleUnstake = async () => {
    if (!unstakeAmount || !address) return;
    
    try {
      setIsUnstaking(true);
      
      await writeStaking({
        address: CONTRACTS.localhost.staking as `0x${string}`,
        abi: stakingAbi,
        functionName: "unstake",
        args: [parseAmount(unstakeAmount)],
      });

      setUnstakeAmount("");
      refetchStakingInfo();
    } catch (error) {
      console.error("Unstaking error:", error);
    } finally {
      setIsUnstaking(false);
    }
  };

  const handleClaimYield = async () => {
    if (!address) return;
    
    try {
      setIsClaiming(true);
      
      await writeStaking({
        address: CONTRACTS.localhost.staking as `0x${string}`,
        abi: stakingAbi,
        functionName: "claimYield",
        args: [],
      });

      refetchStakingInfo();
    } catch (error) {
      console.error("Claim yield error:", error);
    } finally {
      setIsClaiming(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Connect Wallet</CardTitle>
            <CardDescription>Please connect your wallet to access staking features.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const currentTier = userTier ? Number(userTier) : 0;
  const currentAmount = stakingInfo ? formatAmount(stakingInfo[0] as bigint) : 0;
  const pendingYield = 0; // Simplified for MVP - no yield calculation
  const nextTierAmount = currentTier < 3 ? TIER_CONFIG[currentTier + 1].minAmount : 0;
  const progressPercentage = nextTierAmount > 0 ? (currentAmount / nextTierAmount) * 100 : 100;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Instructions Banner */}
      <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
        <h2 className="text-2xl font-bold text-blue-900 mb-3">🚀 How Staking Works</h2>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-3xl mb-2">1️⃣</div>
            <h3 className="font-bold text-blue-800 mb-1">Approve PYUSD</h3>
            <p className="text-gray-600">First, approve the staking contract to use your PYUSD tokens</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-3xl mb-2">2️⃣</div>
            <h3 className="font-bold text-blue-800 mb-1">Stake Tokens</h3>
            <p className="text-gray-600">Deposit PYUSD to earn 9% APY and get tier NFTs</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-3xl mb-2">3️⃣</div>
            <h3 className="font-bold text-blue-800 mb-1">Get Benefits</h3>
            <p className="text-gray-600">Unlock free insurance at $5,000+ (Gold tier)</p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            <strong>💡 Tip:</strong> Make sure you have PYUSD tokens in your wallet. Your balance: <strong>{pyusdBalance ? formatAmount(pyusdBalance as bigint) : 0} PYUSD</strong>
          </p>
        </div>
      </div>

      {/* Tier Benefits Section */}
      <div className="mb-6 p-6 bg-white rounded-lg border shadow-sm">
        <h3 className="text-xl font-bold mb-4">🏆 Staking Tiers & Benefits</h3>
        <div className="grid md:grid-cols-4 gap-4">
          {TIER_CONFIG.map((tier) => (
            <div key={tier.id} className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 transition-colors">
              <div className="text-center mb-2">
                <div className="text-3xl mb-2">{tier.icon}</div>
                <Badge className={TIER_COLORS[tier.id]}>{tier.name}</Badge>
              </div>
              <p className="text-sm font-bold mb-1 text-center">${tier.minAmount}+</p>
              <ul className="text-xs space-y-1 text-gray-600">
                {tier.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Staking Dashboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">💰</span>
              Staking Dashboard
            </CardTitle>
            <CardDescription>
              Stake PYUSD to earn 9% APY and unlock tier benefits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Position */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Current Tier</span>
                <Badge className={`${TIER_COLORS[currentTier]} text-white`}>
                  {TIER_NAMES[currentTier]}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Staked Amount</span>
                <span className="font-mono">${currentAmount.toFixed(2)} PYUSD</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Pending Yield</span>
                <span className="font-mono text-green-600">${pendingYield.toFixed(2)} PYUSD</span>
              </div>
            </div>

            {/* Progress to Next Tier */}
            {nextTierAmount > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress to {TIER_NAMES[currentTier + 1]}</span>
                  <span>{progressPercentage.toFixed(1)}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
                <p className="text-xs text-gray-500">
                  ${currentAmount.toFixed(2)} / ${nextTierAmount.toFixed(2)} PYUSD
                </p>
              </div>
            )}

            {/* PYUSD Balance */}
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium">PYUSD Balance</span>
              <span className="font-mono">
                ${pyusdBalance ? formatAmount(pyusdBalance) : 0}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Staking Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              Staking Actions
            </CardTitle>
            <CardDescription>
              Stake, unstake, and claim your yield rewards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stake */}
            <div className="space-y-3">
              <Label htmlFor="stake-amount">Stake PYUSD</Label>
              <div className="flex gap-2">
                <Input
                  id="stake-amount"
                  type="number"
                  placeholder="0.00"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                />
                <Button
                  onClick={handleStake}
                  disabled={!stakeAmount || isStaking || isStakePending}
                  className="min-w-[100px]"
                >
                  {isStaking || isStakePending ? "Staking..." : "Stake"}
                </Button>
              </div>
            </div>

            {/* Unstake */}
            <div className="space-y-3">
              <Label htmlFor="unstake-amount">Unstake PYUSD</Label>
              <div className="flex gap-2">
                <Input
                  id="unstake-amount"
                  type="number"
                  placeholder="0.00"
                  value={unstakeAmount}
                  onChange={(e) => setUnstakeAmount(e.target.value)}
                />
                <Button
                  onClick={handleUnstake}
                  disabled={!unstakeAmount || isUnstaking}
                  variant="outline"
                  className="min-w-[100px]"
                >
                  {isUnstaking ? "Unstaking..." : "Unstake"}
                </Button>
              </div>
            </div>

            {/* Claim Yield */}
            <div className="space-y-3">
              <Label>Claim Pending Yield</Label>
              <Button
                onClick={handleClaimYield}
                disabled={pendingYield === 0 || isClaiming}
                className="w-full"
                variant="secondary"
              >
                {isClaiming ? "Claiming..." : `Claim $${pendingYield.toFixed(2)} PYUSD`}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tier Benefits */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🎁</span>
            Tier Benefits
          </CardTitle>
          <CardDescription>
            Unlock exclusive benefits by staking more PYUSD
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((tier) => (
              <div
                key={tier}
                className={`p-4 rounded-lg border-2 ${
                  tier === currentTier
                    ? "border-blue-500 bg-blue-50"
                    : tier < currentTier
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={`${TIER_COLORS[tier]} text-white`}>
                    {TIER_NAMES[tier]}
                  </Badge>
                  {tier === currentTier && (
                    <Badge variant="outline" className="text-blue-600">
                      Current
                    </Badge>
                  )}
                </div>
                <div className="text-sm space-y-1">
                  <p>• Earn 9% APY</p>
                  {tier >= 1 && <p>• $50 insurance credit</p>}
                  {tier >= 2 && <p>• FREE Gold insurance</p>}
                  {tier >= 3 && <p>• FREE Platinum insurance</p>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Success Modal */}
      {showSuccessModal && newlyEarnedTier !== null && newlyEarnedTier >= 1 && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md mx-4 animate-in zoom-in-95 duration-500 border-4 border-yellow-400">
            <button
              onClick={() => setShowSuccessModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="text-center">
              <div className="text-7xl mb-4 animate-bounce">{TIER_CONFIG[newlyEarnedTier].icon}</div>
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-yellow-600 to-yellow-800 bg-clip-text text-transparent">
                Congratulations!
              </h2>
              <p className="text-xl mb-6 text-gray-700">
                You are now eligible to mint a <strong className="text-yellow-600">{TIER_CONFIG[newlyEarnedTier].name} Pack</strong>!
              </p>
              
              <div className="bg-gradient-to-r from-green-400 via-green-500 to-green-600 p-6 rounded-xl mb-6 shadow-lg transform hover:scale-105 transition-transform">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="text-3xl">🎁</div>
                  <p className="text-white font-bold text-lg">
                    Get FREE Insurance!
                  </p>
                </div>
                <p className="text-green-50 text-sm mb-2">
                  Pay only gas fees - $0 PYUSD premium
                </p>
                <p className="text-white font-bold text-2xl">
                  {TIER_CONFIG[newlyEarnedTier].quarterlyInsurance} insurances per quarter
                </p>
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={() => {
                    setShowSuccessModal(false);
                    router.push('/packs');
                  }} 
                  className="w-full text-lg py-6 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 shadow-lg"
                >
                  View My Packs 🎁
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
