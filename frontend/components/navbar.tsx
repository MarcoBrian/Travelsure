"use client"
import { Button } from "@/components/ui/button"
import { useAccount, useWallet } from "@/lib/wallet-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export function Navbar() {
  const { address, isConnected } = useAccount()
  const { connect, disconnect, isConnecting, error, isMetaMaskInstalled } = useWallet()
  const router = useRouter()

  // Navigate to dashboard when wallet is connected
  useEffect(() => {
    if (isConnected && window.location.pathname === "/") {
      router.push("/dashboard")
    }
  }, [isConnected, router])

  const handleConnect = async () => {
    if (isConnected) {
      router.push("/dashboard")
    } else {
      await connect()
    }
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-6xl px-4 h-14 md:h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {/* Shield Icon */}
            <div className="relative">
              <svg 
                width="32" 
                height="32" 
                viewBox="0 0 32 32" 
                className="text-blue-600"
                fill="currentColor"
              >
                <path d="M16 2L4 6v8c0 8.5 4.5 16 12 18 7.5-2 12-9.5 12-18V6L16 2z"/>
                {/* Airplane inside shield */}
                <path 
                  d="M12 16l4-4 4 4-2 2-2-2-2 2z" 
                  fill="white"
                  className="text-white"
                />
                {/* Contrails */}
                <path 
                  d="M18 12c2 0 4 1 4 3s-2 3-4 3" 
                  stroke="white" 
                  strokeWidth="1.5" 
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
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
          {!isMetaMaskInstalled ? (
            <Button 
              onClick={() => window.open('https://metamask.io/download/', '_blank')}
              variant="outline"
            >
              Install MetaMask
            </Button>
          ) : isConnected ? (
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-700 font-medium">
                  {formatAddress(address!)}
                </span>
              </div>
              <Button 
                onClick={disconnect}
                variant="outline"
                size="sm"
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <Button 
              onClick={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Connecting...
                </div>
              ) : (
                'Connect MetaMask'
              )}
            </Button>
          )}
          
          {error && (
            <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
