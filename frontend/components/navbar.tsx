"use client"
import { Button } from "@/components/ui/button"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount, useConnect, useDisconnect, useReadContract } from "wagmi"
import Image from "next/image"
import { CONTRACTS } from "@/lib/contracts"
import { tierNFTAbi } from "@/lib/abi/tierNFT"

export function Navbar() {
  const { address, isConnected, chainId } = useAccount()
  const chainKey = chainId === 31337 || chainId === 1337 ? "localhost" : undefined
  const tierNFTAddress = chainKey ? CONTRACTS[chainKey].tierNFT : undefined

  // Read user's tier
  const { data: userTier } = useReadContract({
    abi: tierNFTAbi,
    address: tierNFTAddress as `0x${string}` | undefined,
    functionName: "getTier",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(tierNFTAddress && address) }
  }) as { data: bigint | undefined }

  const tierNumber = userTier !== undefined ? Number(userTier) : 0
  const tierIcons = ["🥉", "🥈", "🥇", "💎"]
  const tierNames = ["Basic", "Silver", "Gold", "Platinum"]
  const tierColors = [
    "bg-blue-100 text-blue-800 border-blue-300",
    "bg-gray-200 text-gray-800 border-gray-400",
    "bg-yellow-100 text-yellow-800 border-yellow-400",
    "bg-purple-100 text-purple-800 border-purple-400"
  ]


  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-6xl px-4 h-14 md:h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {/* Brand logo */}
            <div className="relative h-8 w-8">
              <Image
                src="/travelsure-logo.png"
                alt="Travelsure logo"
                fill
                sizes="32px"
                priority
              />
            </div>
            {/* Text */}
            <div className="flex flex-col">
              <span className="text-xl font-bold text-blue-900">Travelsure</span>
              <span className="text-xs text-blue-600 -mt-1">WEB3 FLIGHT INSURANCE</span>
            </div>
          </div>
        </a>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          {isConnected && tierNumber >= 1 && (
            <a 
              href="/staking" 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 font-semibold transition-all hover:scale-105 ${tierColors[tierNumber]}`}
              title={`Your tier: ${tierNames[tierNumber]}`}
            >
              <span className="text-lg">{tierIcons[tierNumber]}</span>
              <span className="text-xs">{tierNames[tierNumber]}</span>
            </a>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {isConnected && tierNumber >= 1 && (
            <a 
              href="/staking" 
              className={`md:hidden flex items-center gap-1 px-2 py-1 rounded-lg border-2 font-semibold ${tierColors[tierNumber]}`}
              title={`Your tier: ${tierNames[tierNumber]}`}
            >
              <span>{tierIcons[tierNumber]}</span>
            </a>
          )}
          <ConnectButton />
        </div>
      </div>
    </header>
  )
}
