"use client"

const airlines = [
  { name: "Delta Air Lines", query: "Delta Airline Logo" },
  { name: "United Airlines", query: "United Airline Logo" },
  { name: "American Airlines", query: "American Airline Logo" },
  { name: "Lufthansa", query: "Lufthansa Airline Logo" },
  { name: "Emirates", query: "Emirates Airline Logo" },
  { name: "Qatar Airways", query: "Qatar Airways Logo" },
  { name: "Air France", query: "Air France Logo" },
  { name: "KLM", query: "KLM Airline Logo" },
  { name: "British Airways", query: "British Airways Logo" },
  { name: "Singapore Airlines", query: "Singapore Airlines Logo" },
]

export function AirlineCarousel() {
  return (
    <div className="relative overflow-hidden" aria-label="Airlines we cover" role="region">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent" />

      <ul
        className="flex gap-8 md:gap-10 items-center animate-[marquee_30s_linear_infinite] motion-reduce:animate-none will-change-transform"
        role="list"
        aria-live="polite"
      >
        {[...airlines, ...airlines].map((a, i) => (
          <li key={`${a.name}-${i}`} className="shrink-0">
            <div className="flex items-center gap-3">
              <img
                src={`/placeholder.svg?height=40&width=120&query=${encodeURIComponent(a.query)}`}
                alt={`${a.name} logo`}
                className="h-10 w-[120px] object-contain"
              />
            </div>
          </li>
        ))}
      </ul>

      <style jsx>{`
        @keyframes marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  )
}
