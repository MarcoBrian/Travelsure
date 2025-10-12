"use client"

import { useAppKitAccount } from "@reown/appkit/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { FlightInsuranceForm } from "@/components/flight-insurance-form"

export default function DashboardPage() {
  const { address, isConnected } = useAppKitAccount()
  const router = useRouter()

  // Redirect to home if not connected
  useEffect(() => {
    if (!isConnected) {
      router.push("/")
    }
  }, [isConnected, router])

  if (!isConnected) {
    return null
  }

  return (
    <main 
      className="min-h-screen bg-cover bg-center bg-fixed relative"
      style={{
        backgroundImage: "url('/dashboard-bg.jpg')",
      }}
    >
      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/40 via-blue-800/30 to-blue-900/50" />
      
      {/* Content */}
      <div className="relative z-10">
        <Navbar />
        
        <div className="mx-auto max-w-5xl px-4 py-8 md:py-16">
          {/* Welcome Section */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 drop-shadow-lg">
              Protect Your Journey
            </h1>
            <p className="text-lg text-white/90 drop-shadow-md max-w-2xl mx-auto">
              Blockchain-powered flight insurance. Instant payouts for delays, cancellations, and diversions.
            </p>
          </div>

          {/* Insurance Form */}
          <FlightInsuranceForm />

          {/* Trust Indicators */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20 text-center">
              <div className="text-3xl font-bold text-white mb-2">Instant</div>
              <p className="text-white/80 text-sm">Automated payouts via smart contracts</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20 text-center">
              <div className="text-3xl font-bold text-white mb-2">Transparent</div>
              <p className="text-white/80 text-sm">All transactions on blockchain</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20 text-center">
              <div className="text-3xl font-bold text-white mb-2">Secure</div>
              <p className="text-white/80 text-sm">Powered by Etherisc protocol</p>
            </div>
          </div>

          {/* Wallet Info - Compact */}
          <div className="mt-8 bg-white/5 backdrop-blur-sm p-4 rounded-lg border border-white/10">
            <div className="flex items-center justify-center gap-3 text-white/70 text-sm">
              <span>Connected:</span>
              <code className="font-mono bg-white/10 px-3 py-1 rounded">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </code>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

