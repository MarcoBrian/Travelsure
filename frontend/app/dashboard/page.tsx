"use client"

import { useAccount } from "@/lib/wallet-context"
import { useRouter } from "next/navigation"
import { useEffect, Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { FlightInsuranceForm } from "@/components/flight-insurance-form"
import dynamic from "next/dynamic"
import { Sparkles, Shield, Zap, TrendingUp } from "lucide-react"

const WorldMap = dynamic(() => import("@/components/ui/world-map"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 animate-pulse" />
  )
})

export default function DashboardPage() {
  const { address, isConnected } = useAccount()
  const router = useRouter()

  // Redirect to home if not connected
  useEffect(() => {
    if (isConnected === false) {
      router.push("/")
    }
  }, [isConnected, router])

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-4 border-white opacity-20"></div>
        </div>
      </div>
    )
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-4 border-white opacity-20"></div>
        </div>
      </div>
    }>
      <div className="min-h-screen relative overflow-hidden">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 animate-gradient-shift">
          {/* Overlay pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: '40px 40px'
            }}></div>
          </div>
        </div>

        {/* Floating Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10">
          <Navbar />
          
          {/* Hero Section with Glassmorphism */}
          <div className="pt-12 pb-16 px-4">
            <div className="mx-auto max-w-5xl">
              {/* Status Badge */}
              <div className="flex justify-center mb-8 animate-fade-in">
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full shadow-lg">
                  <div className="relative">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 w-3 h-3 bg-green-400 rounded-full animate-ping opacity-75"></div>
                  </div>
                  <span className="text-white text-sm font-semibold tracking-wide">✈️ Decentralized Flight Insurance</span>
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                </div>
              </div>
              
              {/* Main Title */}
              <div className="text-center mb-12 animate-fade-in-up">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white mb-6 tracking-tight leading-tight">
                  Protect Your
                  <span className="block bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
                    Journey
                  </span>
                </h1>
                <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto font-light leading-relaxed">
                  Instant payouts powered by smart contracts. No paperwork, no waiting. Just peace of mind.
                </p>
                
                {/* Feature Pills */}
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full">
                    <Zap className="w-4 h-4 text-yellow-300" />
                    <span className="text-white text-sm font-medium">Instant Payouts</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full">
                    <Shield className="w-4 h-4 text-green-300" />
                    <span className="text-white text-sm font-medium">Smart Contract Protected</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full">
                    <TrendingUp className="w-4 h-4 text-blue-300" />
                    <span className="text-white text-sm font-medium">Real-time Data</span>
                  </div>
                </div>
                
                {/* Wallet Connection Status */}
                {address && (
                  <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-gradient-to-r from-green-400/20 to-emerald-400/20 backdrop-blur-md border border-green-300/30 rounded-full shadow-lg animate-fade-in">
                    <div className="relative">
                      <div className="w-2.5 h-2.5 bg-green-400 rounded-full"></div>
                      <div className="absolute inset-0 w-2.5 h-2.5 bg-green-400 rounded-full animate-ping opacity-75"></div>
                    </div>
                    <span className="text-white font-mono text-sm font-semibold">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Form Section with Enhanced Glassmorphism */}
          <div className="px-4 pb-20">
            <div className="mx-auto max-w-6xl">
              <div className="backdrop-blur-xl bg-white/95 rounded-3xl shadow-2xl border border-white/20 p-2 animate-fade-in-up animation-delay-200">
                <FlightInsuranceForm />
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="px-4 pb-20">
            <div className="mx-auto max-w-6xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-6 text-center animate-fade-in-up animation-delay-400">
                  <div className="text-4xl font-bold text-white mb-2">$2.5M+</div>
                  <div className="text-blue-100 font-medium">Protected Value</div>
                </div>
                <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-6 text-center animate-fade-in-up animation-delay-500">
                  <div className="text-4xl font-bold text-white mb-2">10K+</div>
                  <div className="text-blue-100 font-medium">Policies Issued</div>
                </div>
                <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-6 text-center animate-fade-in-up animation-delay-600">
                  <div className="text-4xl font-bold text-white mb-2">99.9%</div>
                  <div className="text-blue-100 font-medium">Payout Success</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Suspense>
  )
}
