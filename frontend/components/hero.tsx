"use client";

import { Button } from "@/components/ui/button"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useEffect } from "react"

export function Hero() {
  const router = useRouter()
  useEffect(() => {
    router.prefetch("/dashboard")
  }, [router])

  // Lazy-load heavy visual to speed up first paint
  // const WorldMap = dynamic(() => import("@/components/ui/world-map"), {
  //   ssr: false,
  //   loading: () => <div className="absolute inset-0" />
  // })
  return (
    <section className="relative overflow-hidden">
      {/* World Map Background */}
      {/* <div className="absolute inset-0 z-0">
        <WorldMap
          dots={[
            {
              start: { lat: 40.7128, lng: -74.0060 }, // New York
              end: { lat: 51.5074, lng: -0.1278 }, // London
            },
            {
              start: { lat: 40.7128, lng: -74.0060 }, // New York
              end: { lat: 35.6762, lng: 139.6503 }, // Tokyo
            },
            {
              start: { lat: 51.5074, lng: -0.1278 }, // London
              end: { lat: -33.8688, lng: 151.2093 }, // Sydney
            },
            {
              start: { lat: 35.6762, lng: 139.6503 }, // Tokyo
              end: { lat: -33.8688, lng: 151.2093 }, // Sydney
            },
            {
              start: { lat: 40.7128, lng: -74.0060 }, // New York
              end: { lat: -22.9068, lng: -43.1729 }, // Rio de Janeiro
            },
            {
              start: { lat: 51.5074, lng: -0.1278 }, // London
              end: { lat: 28.6139, lng: 77.209 }, // New Delhi
            },
          ]}
          lineColor="#0ea5e9"
        />
      </div> */}
      
      {/* Content with backdrop */}
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-14 md:py-24">
        <div className="grid gap-8 md:grid-cols-2 md:gap-12 items-center">
          <div className="relative">
            {/* Backdrop for better text readability */}
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg border border-border/50 -m-4"></div>
            <div className="relative z-10 p-4">
            <p className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs md:text-sm text-secondary-foreground">
              On‑chain flight delay insurance
            </p>
            <h1 className="mt-4 text-pretty text-4xl md:text-5xl font-semibold tracking-tight">
              Instant payouts when your flight is delayed.
            </h1>
            <p className="mt-4 text-pretty text-base md:text-lg text-muted-foreground">
              Travelsure uses smart contracts and chainlink oracles to verify delays and pay claims instantly in PayPal USD. No
              paperwork. No waiting. 
              
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="sm:w-auto w-full cursor-pointer" asChild>
                <Link href="/dashboard" prefetch>
                  Get Covered
                </Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="sm:w-auto w-full bg-transparent"
                onClick={() => {
                  document.getElementById('how-it-works')?.scrollIntoView({ 
                    behavior: 'smooth' 
                  });
                }}
              >
                How it works
              </Button>
            </div>
            <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-primary/50" />
                Non‑custodial contracts
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-primary/50" />
                Oracle‑verified delays
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-primary/50" />
                Fixed premiums, no hidden fees
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-primary/50" />
                Global airline coverage
              </li>
            </ul>
            </div>
          </div>

          <div className="relative">
            {/* Backdrop for better card readability */}
            <div className="absolute inset-0 bg-background/90 backdrop-blur-sm rounded-xl -m-2"></div>
            <div className="relative z-10 rounded-xl border bg-card/50 p-6 md:p-8">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Flight Delay Policy</p>
                <h3 className="text-lg font-medium">NYC → SF • Tonight 19:45 PM EST</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Premium</p>
                  <p className="mt-1 text-xl font-semibold">10 PYUSD</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Payout</p>
                  <p className="mt-1 text-xl font-semibold text-primary">200 PYUSD</p>
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="mt-1 font-medium"> Active Policy </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
                <p className="text-sm text-muted-foreground">Smart contract ready. Oracles monitoring flight status.</p>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
