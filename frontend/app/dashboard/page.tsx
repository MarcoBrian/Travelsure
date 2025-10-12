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
          <div className="mb-10 text-center">
            <div className="inline-block mb-4">
              <div className="bg-white/10 backdrop-blur-md px-6 py-2 rounded-full border border-white/20">
                <p className="text-white/90 text-sm font-medium">
                  ✈️ Decentralized Flight Insurance
                </p>
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-white mb-4 drop-shadow-2xl tracking-tight">
              Protect Your Journey
            </h1>
            <p className="text-xl text-white/90 drop-shadow-lg max-w-3xl mx-auto leading-relaxed">
              Instant payouts powered by smart contracts. No paperwork, no waiting.
            </p>
          </div>

          {/* Insurance Form */}
          <FlightInsuranceForm />

          {/* Trust Indicators */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group bg-white/10 backdrop-blur-md p-8 rounded-2xl border-2 border-white/20 hover:border-white/40 text-center transition-all hover:bg-white/15 hover:scale-105">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 backdrop-blur-sm rounded-full mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="text-4xl font-black text-white mb-3">Instant</div>
              <p className="text-white/90 text-sm leading-relaxed">Automated payouts via smart contracts within minutes</p>
            </div>
            <div className="group bg-white/10 backdrop-blur-md p-8 rounded-2xl border-2 border-white/20 hover:border-white/40 text-center transition-all hover:bg-white/15 hover:scale-105">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/20 backdrop-blur-sm rounded-full mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-4xl font-black text-white mb-3">Transparent</div>
              <p className="text-white/90 text-sm leading-relaxed">All transactions recorded immutably on blockchain</p>
            </div>
            <div className="group bg-white/10 backdrop-blur-md p-8 rounded-2xl border-2 border-white/20 hover:border-white/40 text-center transition-all hover:bg-white/15 hover:scale-105">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500/20 backdrop-blur-sm rounded-full mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="text-4xl font-black text-white mb-3">Secure</div>
              <p className="text-white/90 text-sm leading-relaxed">Powered by audited Etherisc protocol</p>
            </div>
          </div>

          {/* Wallet Info - Compact */}
          <div className="mt-12 bg-white/5 backdrop-blur-sm p-5 rounded-xl border border-white/10">
            <div className="flex items-center justify-center gap-4 text-white/80 text-sm">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="font-medium">Wallet Connected</span>
              <code className="font-mono bg-white/10 px-4 py-2 rounded-lg border border-white/20 font-semibold">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </code>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

