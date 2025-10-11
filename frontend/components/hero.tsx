import { Button } from "@/components/ui/button"

export function Hero() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-4 py-14 md:py-24">
        <div className="grid gap-8 md:grid-cols-2 md:gap-12 items-center">
          <div>
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
              <Button size="lg" className="sm:w-auto w-full">
                Get Covered
              </Button>
              <Button size="lg" variant="outline" className="sm:w-auto w-full bg-transparent">
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

          <div className="relative rounded-xl border bg-card p-6 md:p-8">
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
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                <p className="text-sm text-muted-foreground">Smart contract ready. Oracles monitoring flight status.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
