"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { formatUnits } from "viem";

interface Package {
  packageId: bigint;
  name: string;
  minStake: bigint;
  lockDuration: bigint;
  yieldRateBps: bigint;
  insuranceClaims: number;
  active: boolean;
}

interface PackageSelectorProps {
  packages: Package[];
  onSelectPackage: (packageId: number) => void;
  isLoading?: boolean;
}

const PACKAGE_COLORS = {
  0: "from-amber-500/20 to-amber-600/20 border-amber-500/30", // Bronze
  1: "from-slate-400/20 to-slate-500/20 border-slate-400/30", // Silver
  2: "from-yellow-500/20 to-yellow-600/20 border-yellow-500/30", // Gold
};

const PACKAGE_ICONS = {
  0: "🥉", // Bronze
  1: "🥈", // Silver
  2: "🥇", // Gold
};

export function PackageSelector({ packages, onSelectPackage, isLoading }: PackageSelectorProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-32 bg-muted rounded"></div>
          </Card>
        ))}
      </div>
    );
  }

  if (!packages || packages.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No packages available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {packages.map((pkg) => {
        const packageId = Number(pkg.packageId);
        const minStake = formatUnits(pkg.minStake, 6);
        const lockDays = Number(pkg.lockDuration) / (24 * 60 * 60);
        const yieldRate = Number(pkg.yieldRateBps) / 100;
        
        return (
          <Card
            key={packageId}
            className={`relative overflow-hidden border-2 bg-gradient-to-br ${PACKAGE_COLORS[packageId as keyof typeof PACKAGE_COLORS] || "from-muted/20 to-muted/30"} transition-all hover:scale-105 hover:shadow-lg`}
          >
            {/* Package Icon */}
            <div className="absolute top-4 right-4 text-4xl opacity-20">
              {PACKAGE_ICONS[packageId as keyof typeof PACKAGE_ICONS] || "📦"}
            </div>

            <div className="p-6 space-y-4">
              {/* Header */}
              <div>
                <h3 className="text-2xl font-bold">{pkg.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {lockDays} day lock period
                </p>
              </div>

              {/* Price */}
              <div className="py-4 border-t border-b border-border/50">
                <div className="text-3xl font-bold">
                  ${Number(minStake).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  Minimum stake in USDC
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">
                    <strong>{yieldRate}% APY</strong> on staked USDC
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">
                    <strong>{pkg.insuranceClaims} free</strong> flight {pkg.insuranceClaims === 1 ? "policy" : "policies"}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">
                    Principal returned after {lockDays} days
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">
                    Real yield from Aave V3
                  </span>
                </div>
              </div>

              {/* CTA Button */}
              <Button
                className="w-full"
                size="lg"
                onClick={() => onSelectPackage(packageId)}
              >
                Stake Now
              </Button>

              {/* Estimated Returns */}
              <div className="text-xs text-center text-muted-foreground pt-2 border-t border-border/50">
                Est. value after {lockDays} days:{" "}
                <strong className="text-foreground">
                  ${(Number(minStake) * (1 + yieldRate / 100 * lockDays / 365) + pkg.insuranceClaims * 20).toLocaleString()}
                </strong>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

