"use client"
import { Button } from "@/components/ui/button"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount, useConnect, useDisconnect } from "wagmi"
import Image from "next/image"

export function Navbar() {
  const { address, isConnected } = useAccount()


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
        </nav>
        <div className="flex items-center gap-2">
          <ConnectButton />
        </div>
      </div>
    </header>
  )
}
