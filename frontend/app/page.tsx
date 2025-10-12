import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { AirlineCarousel } from "@/components/airline-carousel"
import { HowItWorks } from "@/components/how-it-works"
import { AiAgent } from "@/components/ai-agent"
import { CtaBanner } from "@/components/cta-banner"

export default function Page() {
  return (
    <main className="min-h-dvh">
      <Navbar />
      <Hero />
      <section id="partners" className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <h2 className="text-center text-balance text-xl md:text-2xl font-medium text-muted-foreground">
            Coverage across leading airlines
          </h2>
          <div className="mt-6 md:mt-8">
            <AirlineCarousel />
          </div>
        </div>
      </section>
      <HowItWorks />
      <AiAgent />
      <CtaBanner />
      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground flex items-center justify-between">
          <p>© {new Date().getFullYear()} Travelsure. All rights reserved.</p>
          <nav className="flex items-center gap-4">
            <a href="#how-it-works" className="hover:text-foreground">
              How it works
            </a>
            <a href="#ai-agent" className="hover:text-foreground">
              AI Agent
            </a>
          </nav>
        </div>
      </footer>
    </main>
  )
}
