"use client"

import { useAccount } from "wagmi"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Navbar } from "@/components/navbar"
import { FlightInsuranceForm } from "@/components/flight-insurance-form"
import { MyInsurance } from "../../components/my-insurance"
import dynamic from "next/dynamic"

const WorldMap = dynamic(() => import("@/components/ui/world-map"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 animate-pulse" />
  )
})

export default function DashboardPage() {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  // Redirect to home if not connected
  useEffect(() => {
    if (isConnected === false) {
      router.push("/")
    }
  }, [isConnected, router])

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
      <main className="min-h-screen relative overflow-hidden"> 
        {/* Content */}
        <div className="relative z-10">
          <Navbar />
          
          <div className="mx-auto max-w-5xl px-4 py-8 md:py-16">
            {/* Welcome Section */}
            <div className="mb-10 text-center">
              <div className="inline-block mb-6">
                <div className="bg-blue-100 px-6 py-2 rounded-full border border-blue-200">
                  <p className="text-blue-800 text-sm font-medium">
                    ✈️ Decentralized Flight Insurance
                  </p>
                </div>
              </div>
              <div className="bg-white/95 backdrop-blur-md p-8 rounded-2xl border border-gray-200 shadow-xl max-w-4xl mx-auto">
                <h1 className="text-5xl md:text-6xl font-black text-gray-900 mb-4 tracking-tight">
                  Protect Your Journey
                </h1>
                <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
                  Instant payouts powered by smart contracts. No paperwork, no waiting.
                </p>
                {address && (
                  <div className="mt-4 text-sm text-gray-600">
                    Connected: {address.slice(0, 6)}...{address.slice(-4)}
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <TabsContainer />
            
          </div>
        </div>
      </main>
  )
}
function TabsContainer() {
  const [activeTab, setActiveTab] = useState<"buy" | "mine">("buy")

  return (
    <div>
      <div className="flex items-center border-b border-gray-200 mb-0">
        <button
          type="button"
          onClick={() => setActiveTab("buy")}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
            activeTab === "buy"
              ? "bg-white text-blue-700 border border-blue-200 border-b-0 -mb-px shadow-sm"
              : "bg-white/70 text-gray-700 border border-gray-200 hover:text-gray-900 hover:border-gray-300"
          }`}
        >
          Buy insurance
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("mine")}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
            activeTab === "mine"
              ? "bg-white text-blue-700 border border-blue-200 border-b-0 -mb-px shadow-sm"
              : "bg-white/70 text-gray-700 border border-gray-200 hover:text-gray-900 hover:border-gray-300"
          }`}
        >
          My Insurance
        </button>
      </div>

      <div className="bg-white/95 backdrop-blur-md p-6 rounded-t-none rounded-b-xl border border-gray-200 border-t-0 -mt-px shadow-sm">
        {activeTab === "buy" ? (
          <FlightInsuranceForm />
        ) : (
          <MyInsurance />
        )}
      </div>
    </div>
  )
}


