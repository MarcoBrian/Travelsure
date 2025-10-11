import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function HowItWorks() {
  const steps = [
    {
      title: "1. Buy cover",
      text: "Choose your flight and purchase coverage with a fixed premium. Your policy is recorded on-chain.",
    },
    {
      title: "2. Oracle monitors",
      text: "Decentralized oracles track flight status in real time and verify delays or cancellations.",
    },
    {
      title: "3. Instant payout",
      text: "If a delay triggers your policy, funds are released immediately to your wallet—no claims process.",
    },
  ]

  return (
    <section id="how-it-works" className="border-t">
      <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <h2 className="text-center text-3xl md:text-4xl font-semibold">How it works</h2>
        <p className="mt-3 text-center text-muted-foreground max-w-2xl mx-auto">
          Parametric insurance powered by smart contracts. Transparent terms, automatic execution.
        </p>

        <div className="mt-8 grid gap-4 md:gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <Card key={s.title} className="border bg-card">
              <CardHeader>
                <CardTitle className="text-lg">{s.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-pretty text-muted-foreground">{s.text}</CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
