"use client"

import { useAccount } from "wagmi"
import { useRouter } from "next/navigation"
import { useEffect, Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { FlightInsuranceForm } from "@/components/flight-insurance-form"
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

  // Redirect to home if not connected
  useEffect(() => {
    if (isConnected === false) {
      router.push("/")
    }
  }, [isConnected, router])

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <main className="min-h-screen relative overflow-hidden">
        {/* World Map Background */}
        <div className="absolute inset-0 w-full h-full">
          <Suspense fallback={
            <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100" />
          }>
            {/* <WorldMap 
              dots={[
                {
                  start: { lat: 40.7128, lng: -74.0060, label: "New York" },
                  end: { lat: 51.5074, lng: -0.1278, label: "London" }
                },
                {
                  start: { lat: 35.6762, lng: 139.6503, label: "Tokyo" },
                  end: { lat: 37.7749, lng: -122.4194, label: "San Francisco" }
                },
                {
                  start: { lat: -33.8688, lng: 151.2093, label: "Sydney" },
                  end: { lat: 48.8566, lng: 2.3522, label: "Paris" }
                }
              ]}
              lineColor="#3b82f6"
            /> */}
          </Suspense>
        </div>
        
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

            {/* Insurance Form */}
            <FlightInsuranceForm />
            
          </div>
        </div>
      </main>
    </Suspense>
  )
}

