import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function AiAgent() {

  return (
    <section id="ai-agent" className="border-t bg-gradient-to-b from-background to-secondary/20">
      <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div className="text-center mb-12">
          <p className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs md:text-sm text-primary">
            AI-Powered Recommendations
          </p>
          <h2 className="mt-4 text-3xl md:text-4xl font-semibold">
            Meet Travelsure AI Agent
          </h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Our intelligent agent recommends the perfect insurance policy for your flight. 
            Get personalized coverage suggestions in seconds, not hours.
          </p>
        </div>


        <div className="grid gap-8 md:grid-cols-2 items-center">
          <div>
            <h3 className="text-2xl md:text-3xl font-semibold mb-4">
              How our AI Agent works
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                  1
                </div>
                <div>
                  <h4 className="font-medium">Personalization</h4>
                  <p className="text-sm text-muted-foreground">
                    AI processes your travel data, destination data, and risk factors
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                  2
                </div>
                <div>
                  <h4 className="font-medium">Smart Matching</h4>
                  <p className="text-sm text-muted-foreground">
                    Algorithm matches your profile with optimal coverage options
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                  3
                </div>
                <div>
                  <h4 className="font-medium">Instant Recommendations</h4>
                  <p className="text-sm text-muted-foreground">
                    Receive personalized policy suggestions with clear explanations
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <a 
                href="https://chat.agentverse.ai/sessions?agent=agent1qwkf3g8u75l6ycw2zjykmxewr546r5hu8vcqdzkyzs37la3kxc73jcs4avv" 
                target="_blank" 
                rel="noopener noreferrer"
                className="sm:w-auto w-full"
              >
                <Button size="lg" className="w-full">
                  Try AI Agent
                </Button>
              </a>
            </div>
          </div>

          <div className="relative rounded-xl border bg-card p-6 md:p-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium">AI Agent Active</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Recommended Policy</p>
                <h4 className="text-lg font-medium">Premium Coverage Package</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">AI Confidence</p>
                  <p className="mt-1 text-xl font-semibold text-primary">94%</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Savings</p>
                  <p className="mt-1 text-xl font-semibold text-green-600">$45</p>
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Why this policy?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Based on your travel information and destination risk, this policy offers optimal coverage at the best price.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                <p className="text-sm text-muted-foreground">AI analysis complete. Ready to purchase.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
