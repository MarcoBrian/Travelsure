"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { useRouter } from "next/navigation";
import { CONTRACTS } from "@/lib/contracts";
import { tierNFTAbi } from "@/lib/abi/tierNFT";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Star, Trophy, Crown, ArrowRight } from "lucide-react";

const TIER_CONFIG = [
  { 
    id: 0, 
    name: "Basic", 
    icon: "🥉",
    color: "from-blue-500 to-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-300",
    benefits: ["Earn 9% APY on staked PYUSD"],
    quarterlyInsurance: 0
  },
  { 
    id: 1, 
    name: "Silver", 
    icon: "🥈",
    color: "from-gray-400 to-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-400",
    benefits: ["Earn 9% APY", "FREE insurance", "2 free policies per quarter"], 
    quarterlyInsurance: 2 
  },
  { 
    id: 2, 
    name: "Gold", 
    icon: "🥇",
    color: "from-yellow-400 to-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-400",
    benefits: ["Earn 9% APY", "FREE insurance", "4 free policies per quarter"], 
    quarterlyInsurance: 4 
  },
  { 
    id: 3, 
    name: "Platinum", 
    icon: "💎",
    color: "from-purple-500 to-purple-700",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-400",
    benefits: ["Earn 9% APY", "FREE insurance", "10 free policies per quarter"], 
    quarterlyInsurance: 10 
  }
];

export default function PacksPage() {
  const { address, isConnected, chainId } = useAccount();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const chainKey = chainId === 31337 || chainId === 1337 ? "localhost" : undefined;
  const tierNFTAddress = chainKey ? CONTRACTS[chainKey].tierNFT : undefined;

  // Read user's tier
  const { data: userTier } = useReadContract({
    abi: tierNFTAbi,
    address: tierNFTAddress as `0x${string}` | undefined,
    functionName: "getTier",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(tierNFTAddress && address) }
  });

  const tierNumber = userTier !== undefined ? Number(userTier) : 0;
  const currentTier = TIER_CONFIG[tierNumber];

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Connect Wallet</CardTitle>
            <CardDescription>Please connect your wallet to view your tier pack.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12">
      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-lg mb-6">
            <Star className="w-5 h-5 text-yellow-500" />
            <span className="font-semibold text-gray-700">Your Tier Pack</span>
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            {currentTier.icon} {currentTier.name} Pack
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your staking tier unlocks exclusive benefits and free insurance policies
          </p>
        </div>

        {/* Main Tier Pack Card */}
        <div className="max-w-4xl mx-auto mb-8">
          <Card className={`${currentTier.bgColor} border-4 ${currentTier.borderColor} shadow-2xl animate-in zoom-in-95 duration-500`}>
            <CardHeader className="text-center pb-8">
              <div className="flex justify-center mb-6">
                <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${currentTier.color} flex items-center justify-center shadow-xl animate-bounce`}>
                  <span className="text-6xl">{currentTier.icon}</span>
                </div>
              </div>
              <CardTitle className="text-4xl mb-2">{currentTier.name} Tier</CardTitle>
              <CardDescription className="text-lg">
                {tierNumber >= 1 
                  ? `You have ${currentTier.quarterlyInsurance} FREE insurance policies available per quarter`
                  : "Stake more PYUSD to unlock free insurance benefits"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Benefits Grid */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-gray-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-green-100 rounded-full">
                      <Shield className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="font-bold text-lg">Benefits</h3>
                  </div>
                  <ul className="space-y-2">
                    {currentTier.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-700">
                        <span className="text-green-500 mt-1">✓</span>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-gray-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-blue-100 rounded-full">
                      <Trophy className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="font-bold text-lg">How It Works</h3>
                  </div>
                  <ol className="space-y-2 text-gray-700">
                    <li className="flex gap-2">
                      <span className="font-bold text-blue-600">1.</span>
                      <span>Search for your flight on the home page</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-blue-600">2.</span>
                      <span>Select your insurance tier</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-blue-600">3.</span>
                      <span>Click "Use Free Insurance" button</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-blue-600">4.</span>
                      <span>Pay only gas fees - no PYUSD premium!</span>
                    </li>
                  </ol>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={() => router.push('/')}
                  size="lg"
                  className={`flex-1 py-6 text-lg font-bold bg-gradient-to-r ${currentTier.color} hover:opacity-90 shadow-xl`}
                >
                  Get Insurance Now
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button
                  onClick={() => router.push('/staking')}
                  size="lg"
                  variant="outline"
                  className="flex-1 py-6 text-lg font-bold border-2"
                >
                  Manage Staking
                </Button>
              </div>

              {tierNumber === 0 && (
                <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                  <p className="text-yellow-800 text-center">
                    <strong>💡 Tip:</strong> Stake $500+ PYUSD to unlock Silver tier and get FREE insurance!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* All Tiers Overview */}
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">All Available Tiers</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {TIER_CONFIG.map((tier) => (
              <Card 
                key={tier.id}
                className={`${tier.id === tierNumber ? `${tier.bgColor} border-4 ${tier.borderColor}` : 'border-2 border-gray-200'} transition-all hover:scale-105`}
              >
                <CardHeader className="text-center">
                  <div className="text-4xl mb-2">{tier.icon}</div>
                  <CardTitle className="text-xl">{tier.name}</CardTitle>
                  {tier.id === tierNumber && (
                    <Badge className="mt-2 bg-green-500 text-white">Your Tier</Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-4">
                    <p className="text-sm text-gray-600">Stake Amount</p>
                    <p className="text-lg font-bold">${tier.id === 0 ? 100 : tier.id === 1 ? 500 : tier.id === 2 ? 1000 : 2000}+</p>
                  </div>
                  <div className="space-y-1">
                    {tier.benefits.slice(0, 2).map((benefit, i) => (
                      <p key={i} className="text-xs text-gray-600 flex items-start gap-1">
                        <span className="text-green-500">✓</span>
                        <span>{benefit}</span>
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Info Banner */}
        <div className="max-w-4xl mx-auto mt-12">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white text-center shadow-2xl">
            <Crown className="w-12 h-12 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Upgrade Your Tier</h3>
            <p className="mb-6 text-blue-100">
              Stake more PYUSD to unlock higher tiers and get more free insurance policies!
            </p>
            <Button
              onClick={() => router.push('/staking')}
              size="lg"
              variant="secondary"
              className="bg-white text-purple-600 hover:bg-gray-100 font-bold"
            >
              Go to Staking
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
