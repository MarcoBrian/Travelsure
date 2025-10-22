"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatUnits } from "viem";
import { Clock, TrendingUp, Shield, Lock } from "lucide-react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACTS } from "@/lib/contracts";
import { PackageManagerABI } from "@/lib/abis";

interface UserStakeCardProps {
  address: `0x${string}`;
  chainId: number;
  onSuccess?: () => void;
}

export function UserStakeCard({ address, chainId, onSuccess }: UserStakeCardProps) {
  const contractAddress = chainId === 11155111 
    ? CONTRACTS.sepolia.packageManager 
    : "0x";

  // Get user's stake
  const { data: userStake, refetch } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: PackageManagerABI,
    functionName: "getUserStake",
    args: [address],
  });

  // Get package info
  const { data: packageInfo } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: PackageManagerABI,
    functionName: "getPackageInfo",
    args: userStake && userStake.isActive ? [userStake.packageId] : undefined,
  });

  // Calculate yield
  const { data: yieldAmount } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: PackageManagerABI,
    functionName: "calculateUserYield",
    args: [address],
  });

  // Unstake
  const { writeContract: unstake, data: unstakeHash } = useWriteContract();
  const { isSuccess: isUnstakeSuccess, isLoading: isUnstaking } = useWaitForTransactionReceipt({
    hash: unstakeHash,
  });

  // Claim yield
  const { writeContract: claimYield, data: claimHash } = useWriteContract();
  const { isSuccess: isClaimSuccess, isLoading: isClaiming } = useWaitForTransactionReceipt({
    hash: claimHash,
  });

  if (isUnstakeSuccess || isClaimSuccess) {
    refetch();
    onSuccess?.();
  }

  if (!userStake || !userStake.isActive) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <p>You don't have any active stake</p>
          <p className="text-sm mt-2">Choose a package below to start earning!</p>
        </div>
      </Card>
    );
  }

  const stakedAmount = formatUnits(userStake.stakedAmount, 6);
  const unlockTime = new Date(Number(userStake.unlockTime) * 1000);
  const isLocked = Date.now() < unlockTime.getTime();
  const daysRemaining = Math.max(0, Math.ceil((unlockTime.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const yieldValue = yieldAmount ? formatUnits(yieldAmount, 6) : "0";
  const yieldRate = packageInfo ? Number(packageInfo.yieldRateBps) / 100 : 0;

  const handleUnstake = () => {
    unstake({
      address: contractAddress as `0x${string}`,
      abi: PackageManagerABI,
      functionName: "unstake",
    });
  };

  const handleClaimYield = () => {
    claimYield({
      address: contractAddress as `0x${string}`,
      abi: PackageManagerABI,
      functionName: "claimYield",
    });
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Your Active Stake</h3>
            <p className="text-sm text-muted-foreground">
              {packageInfo?.name || "Loading..."}
            </p>
          </div>
          {isLocked && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-1 rounded-full">
              <Lock className="h-4 w-4" />
              <span className="text-sm font-medium">Locked</span>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Staked Amount */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Staked
            </p>
            <p className="text-2xl font-bold">{stakedAmount}</p>
            <p className="text-xs text-muted-foreground">USDC</p>
          </div>

          {/* Yield Earned */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Yield Earned</p>
            <p className="text-2xl font-bold text-green-600">+{yieldValue}</p>
            <p className="text-xs text-muted-foreground">{yieldRate}% APY</p>
          </div>

          {/* Insurance Claims */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Free Claims
            </p>
            <p className="text-2xl font-bold">
              {userStake.claimsAllowed - userStake.claimsUsed}/{userStake.claimsAllowed}
            </p>
            <p className="text-xs text-muted-foreground">remaining</p>
          </div>

          {/* Time Remaining */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {isLocked ? "Unlocks in" : "Unlocked"}
            </p>
            <p className="text-2xl font-bold">
              {isLocked ? daysRemaining : "✓"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isLocked ? "days" : unlockTime.toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        {isLocked && packageInfo && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Staking Progress</span>
              <span>{Math.floor((1 - daysRemaining / (Number(packageInfo.lockDuration) / 86400)) * 100)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500"
                style={{ 
                  width: `${Math.floor((1 - daysRemaining / (Number(packageInfo.lockDuration) / 86400)) * 100)}%` 
                }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleClaimYield}
            disabled={Number(yieldValue) === 0 || isClaiming}
            className="flex-1"
          >
            {isClaiming ? "Claiming..." : "Claim Yield"}
          </Button>
          <Button
            onClick={handleUnstake}
            disabled={isLocked || isUnstaking}
            className="flex-1"
          >
            {isUnstaking ? "Unstaking..." : isLocked ? `Locked (${daysRemaining}d)` : "Unstake"}
          </Button>
        </div>

        {/* Info */}
        {isLocked && (
          <p className="text-xs text-center text-muted-foreground">
            You can unstake after {unlockTime.toLocaleString()}
          </p>
        )}
      </div>
    </Card>
  );
}

