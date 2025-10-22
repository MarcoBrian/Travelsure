"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { CONTRACTS } from "@/lib/contracts";
import { PackageManagerABI, MockUSDCABI } from "@/lib/abis";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface Package {
  packageId: bigint;
  name: string;
  minStake: bigint;
  lockDuration: bigint;
  yieldRateBps: bigint;
  insuranceClaims: number;
  active: boolean;
}

interface StakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPackage: Package | null;
  chainId: number;
}

export function StakeModal({ isOpen, onClose, selectedPackage, chainId }: StakeModalProps) {
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"input" | "approve" | "stake" | "success">("input");
  const { address } = useAccount();

  const contractAddress = chainId === 11155111 
    ? CONTRACTS.sepolia.packageManager 
    : "0x";

  const usdcAddress = chainId === 11155111
    ? CONTRACTS.sepolia.usdc
    : "0x";

  // Check USDC balance
  const { data: usdcBalance } = useReadContract({
    address: usdcAddress as `0x${string}`,
    abi: MockUSDCABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // Check USDC allowance
  const { data: allowance } = useReadContract({
    address: usdcAddress as `0x${string}`,
    abi: MockUSDCABI,
    functionName: "allowance",
    args: address && contractAddress ? [address, contractAddress as `0x${string}`] : undefined,
  });

  // Approve USDC
  const { writeContract: approve, data: approveHash } = useWriteContract();
  const { isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  // Stake
  const { writeContract: stake, data: stakeHash } = useWriteContract();
  const { isSuccess: isStakeSuccess, isLoading: isStaking } = useWaitForTransactionReceipt({
    hash: stakeHash,
  });

  if (!selectedPackage) return null;

  const minStake = formatUnits(selectedPackage.minStake, 6);
  const lockDays = Number(selectedPackage.lockDuration) / (24 * 60 * 60);
  const yieldRate = Number(selectedPackage.yieldRateBps) / 100;

  const handleApprove = async () => {
    if (!amount || !address) return;

    try {
      const amountBigInt = parseUnits(amount, 6);
      setStep("approve");
      
      approve({
        address: usdcAddress as `0x${string}`,
        abi: MockUSDCABI,
        functionName: "approve",
        args: [contractAddress as `0x${string}`, amountBigInt],
      });
    } catch (error) {
      console.error("Approval error:", error);
      setStep("input");
    }
  };

  const handleStake = async () => {
    if (!amount || !address) return;

    try {
      const amountBigInt = parseUnits(amount, 6);
      setStep("stake");
      
      stake({
        address: contractAddress as `0x${string}`,
        abi: PackageManagerABI,
        functionName: "buyPackage",
        args: [selectedPackage.packageId, amountBigInt],
      });
    } catch (error) {
      console.error("Stake error:", error);
      setStep("input");
    }
  };

  // Auto-progress through steps
  if (isApproveSuccess && step === "approve") {
    handleStake();
  }

  if (isStakeSuccess && step === "stake") {
    setStep("success");
  }

  const needsApproval = allowance !== undefined && 
    amount && 
    parseUnits(amount, 6) > (allowance as bigint);

  const hasEnoughBalance = usdcBalance !== undefined &&
    amount &&
    parseUnits(amount, 6) <= (usdcBalance as bigint);

  const isValidAmount = amount && 
    Number(amount) >= Number(minStake);

  const handleClose = () => {
    setAmount("");
    setStep("input");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Stake in {selectedPackage.name}</DialogTitle>
          <DialogDescription>
            Lock your USDC for {lockDays} days and earn {yieldRate}% APY + {selectedPackage.insuranceClaims} free flight {selectedPackage.insuranceClaims === 1 ? "policy" : "policies"}
          </DialogDescription>
        </DialogHeader>

        {step === "success" ? (
          <div className="py-8 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Successfully Staked!</h3>
              <p className="text-sm text-muted-foreground mt-2">
                You've staked {amount} USDC in {selectedPackage.name}
              </p>
            </div>
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USDC)</Label>
              <Input
                id="amount"
                type="number"
                placeholder={`Min: ${minStake} USDC`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={step !== "input"}
              />
              {usdcBalance !== undefined && (
                <p className="text-xs text-muted-foreground">
                  Balance: {formatUnits(usdcBalance as bigint, 6)} USDC
                </p>
              )}
            </div>

            {/* Validation Messages */}
            {amount && !isValidAmount && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>Minimum stake is {minStake} USDC</span>
              </div>
            )}

            {amount && !hasEnoughBalance && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>Insufficient USDC balance</span>
              </div>
            )}

            {/* Package Details */}
            <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Lock Period</span>
                <span className="font-medium">{lockDays} days</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Yield Rate</span>
                <span className="font-medium">{yieldRate}% APY</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Free Insurance</span>
                <span className="font-medium">{selectedPackage.insuranceClaims} policies</span>
              </div>
              {amount && isValidAmount && (
                <>
                  <div className="border-t pt-2 mt-2"></div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Est. Yield</span>
                    <span className="font-medium text-green-600">
                      +{(Number(amount) * yieldRate / 100 * lockDays / 365).toFixed(2)} USDC
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Total Value</span>
                    <span>
                      ${(Number(amount) * (1 + yieldRate / 100 * lockDays / 365) + selectedPackage.insuranceClaims * 20).toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Action Button */}
            <DialogFooter>
              {step === "input" ? (
                needsApproval ? (
                  <Button
                    onClick={handleApprove}
                    disabled={!isValidAmount || !hasEnoughBalance}
                    className="w-full"
                  >
                    Approve USDC
                  </Button>
                ) : (
                  <Button
                    onClick={handleStake}
                    disabled={!isValidAmount || !hasEnoughBalance}
                    className="w-full"
                  >
                    Stake Now
                  </Button>
                )
              ) : (
                <Button disabled className="w-full">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {step === "approve" ? "Approving..." : "Staking..."}
                </Button>
              )}
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

