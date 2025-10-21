"use client";

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useRouter } from "next/navigation"

export function CtaBanner() {
  const router = useRouter()
  useEffect(() => {
    router.prefetch("/dashboard")
  }, [router])

  return (
    <section className="border-t bg-secondary">
      <div className="mx-auto max-w-6xl px-4 py-12 md:py-16 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-pretty text-2xl md:text-3xl font-semibold">
            Fly with confidence. Get covered in minutes.
          </h3>
          <p className="mt-2 text-muted-foreground">
            Simple pricing, instant on‑chain payouts, and coverage for leading airlines.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button size="lg" variant="outline">
            <Link href="/dashboard" prefetch>
              Get Covered
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
