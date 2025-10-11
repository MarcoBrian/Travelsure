"use client"
import { Button } from "@/components/ui/button"

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-6xl px-4 h-14 md:h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-3">
          <img
            src="/images/design-mode/Gemini_Generated_Image_nufowenufowenufo.png"
            alt="Travelsure logo"
            className="h-8 w-auto"
          />
          <span className="sr-only">Travelsure</span>
        </a>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <a href="#how-it-works" className="text-muted-foreground hover:text-foreground">
            How it works
          </a>
          <a href="#partners" className="text-muted-foreground hover:text-foreground">
            Airlines
          </a>
          <a href="#" className="text-muted-foreground hover:text-foreground">
            Docs
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="hidden md:inline-flex">
            Sign in
          </Button>
          <Button>Launch App</Button>
        </div>
      </div>
    </header>
  )
}
