"use client"

const airlines = [
  { 
    name: "Delta Air Lines", 
    logo: `https://img.logo.dev/delta.com?token=${process.env.NEXT_PUBLIC_LOGO_DEV_API_KEY}` 
  },
  { 
    name: "United Airlines", 
    logo: `https://img.logo.dev/united.com?token=${process.env.NEXT_PUBLIC_LOGO_DEV_API_KEY}` 
  },
  { 
    name: "American Airlines", 
    logo: `https://img.logo.dev/aa.com?token=${process.env.NEXT_PUBLIC_LOGO_DEV_API_KEY}` 
  },
  { 
    name: "Lufthansa", 
    logo: `https://img.logo.dev/lufthansa.com?token=${process.env.NEXT_PUBLIC_LOGO_DEV_API_KEY}` 
  },
  { 
    name: "Emirates", 
    logo: `https://img.logo.dev/emirates.com?token=${process.env.NEXT_PUBLIC_LOGO_DEV_API_KEY}` 
  },
  { 
    name: "Qatar Airways", 
    logo: `https://img.logo.dev/qatarairways.com?token=${process.env.NEXT_PUBLIC_LOGO_DEV_API_KEY}` 
  },
  { 
    name: "Air France", 
    logo: `https://img.logo.dev/airfrance.com?token=${process.env.NEXT_PUBLIC_LOGO_DEV_API_KEY}` 
  },
  { 
    name: "British Airways", 
    logo: `https://img.logo.dev/ba.com?token=${process.env.NEXT_PUBLIC_LOGO_DEV_API_KEY}` 
  },
  { 
    name: "Singapore Airlines", 
    logo: `https://img.logo.dev/singaporeair.com?token=${process.env.NEXT_PUBLIC_LOGO_DEV_API_KEY}` 
  },
]

export function AirlineCarousel() {
  return (
    <div className="relative overflow-hidden" aria-label="Airlines we cover" role="region">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent" />

      <ul
        className="flex gap-8 md:gap-10 items-center marquee motion-reduce:animate-none will-change-transform"
        role="list"
        aria-live="polite"
      >
        {[...airlines, ...airlines, ...airlines].map((a, i) => (
          <li key={`${a.name}-${i}`} className="shrink-0">
            <div className="flex items-center gap-3">
              <img
                src={a.logo}
                alt={`${a.name} logo`}
                className="h-12 w-[140px] object-contain"
                onError={(e) => {
                  // Fallback to a placeholder if logo fails to load
                  e.currentTarget.src = `/placeholder.svg?height=48&width=140&text=${encodeURIComponent(a.name)}`
                }}
              />
            </div>
          </li>
        ))}
      </ul>

      <style jsx>{`
        .marquee {
          animation: marquee 15s linear infinite;
        }
        
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }
      `}</style>
    </div>
  )
}
