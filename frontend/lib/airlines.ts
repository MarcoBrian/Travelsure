// Major airlines data with IATA codes
export interface Airline {
  iata: string;
  icao: string;
  name: string;
  country: string;
}

export const AIRLINES: Airline[] = [
  // Indian Airlines
  { iata: "6E", icao: "IGO", name: "IndiGo", country: "India" },
  { iata: "AI", icao: "AIC", name: "Air India", country: "India" },
  { iata: "UK", icao: "VTI", name: "Vistara", country: "India" },
  { iata: "SG", icao: "SEJ", name: "SpiceJet", country: "India" },
  { iata: "G8", icao: "GOW", name: "Go First", country: "India" },
  { iata: "I5", icao: "FLZ", name: "AirAsia India", country: "India" },
  { iata: "QP", icao: "AKB", name: "Akasa Air", country: "India" },
  
  // Major International Airlines
  { iata: "AA", icao: "AAL", name: "American Airlines", country: "USA" },
  { iata: "DL", icao: "DAL", name: "Delta Air Lines", country: "USA" },
  { iata: "UA", icao: "UAL", name: "United Airlines", country: "USA" },
  { iata: "BA", icao: "BAW", name: "British Airways", country: "UK" },
  { iata: "LH", icao: "DLH", name: "Lufthansa", country: "Germany" },
  { iata: "AF", icao: "AFR", name: "Air France", country: "France" },
  { iata: "KL", icao: "KLM", name: "KLM", country: "Netherlands" },
  { iata: "EK", icao: "UAE", name: "Emirates", country: "UAE" },
  { iata: "QR", icao: "QTR", name: "Qatar Airways", country: "Qatar" },
  { iata: "EY", icao: "ETD", name: "Etihad Airways", country: "UAE" },
  { iata: "SQ", icao: "SIA", name: "Singapore Airlines", country: "Singapore" },
  { iata: "TG", icao: "THA", name: "Thai Airways", country: "Thailand" },
  { iata: "CX", icao: "CPA", name: "Cathay Pacific", country: "Hong Kong" },
  { iata: "JL", icao: "JAL", name: "Japan Airlines", country: "Japan" },
  { iata: "NH", icao: "ANA", name: "ANA", country: "Japan" },
  { iata: "KE", icao: "KAL", name: "Korean Air", country: "South Korea" },
  { iata: "OZ", icao: "AAR", name: "Asiana Airlines", country: "South Korea" },
  { iata: "CA", icao: "CCA", name: "Air China", country: "China" },
  { iata: "CZ", icao: "CSN", name: "China Southern", country: "China" },
  { iata: "MU", icao: "CES", name: "China Eastern", country: "China" },
  { iata: "QF", icao: "QFA", name: "Qantas", country: "Australia" },
  { iata: "VA", icao: "VOZ", name: "Virgin Australia", country: "Australia" },
  { iata: "NZ", icao: "ANZ", name: "Air New Zealand", country: "New Zealand" },
  { iata: "AC", icao: "ACA", name: "Air Canada", country: "Canada" },
  { iata: "WS", icao: "WJA", name: "WestJet", country: "Canada" },
  { iata: "AM", icao: "AMX", name: "Aeroméxico", country: "Mexico" },
  { iata: "AV", icao: "AVA", name: "Avianca", country: "Colombia" },
  { iata: "LA", icao: "LAN", name: "LATAM Airlines", country: "Chile" },
  { iata: "TP", icao: "TAP", name: "TAP Air Portugal", country: "Portugal" },
  { iata: "IB", icao: "IBE", name: "Iberia", country: "Spain" },
  { iata: "AZ", icao: "AZA", name: "ITA Airways", country: "Italy" },
  { iata: "LX", icao: "SWR", name: "Swiss International", country: "Switzerland" },
  { iata: "OS", icao: "AUA", name: "Austrian Airlines", country: "Austria" },
  { iata: "SK", icao: "SAS", name: "SAS Scandinavian", country: "Sweden" },
  { iata: "AY", icao: "FIN", name: "Finnair", country: "Finland" },
  { iata: "TK", icao: "THY", name: "Turkish Airlines", country: "Turkey" },
  { iata: "SU", icao: "AFL", name: "Aeroflot", country: "Russia" },
  { iata: "ET", icao: "ETH", name: "Ethiopian Airlines", country: "Ethiopia" },
  { iata: "MS", icao: "MSR", name: "EgyptAir", country: "Egypt" },
  { iata: "SA", icao: "SAA", name: "South African Airways", country: "South Africa" },
  
  // Low-Cost Carriers
  { iata: "WN", icao: "SWA", name: "Southwest Airlines", country: "USA" },
  { iata: "B6", icao: "JBU", name: "JetBlue Airways", country: "USA" },
  { iata: "NK", icao: "NKS", name: "Spirit Airlines", country: "USA" },
  { iata: "F9", icao: "FFT", name: "Frontier Airlines", country: "USA" },
  { iata: "FR", icao: "RYR", name: "Ryanair", country: "Ireland" },
  { iata: "U2", icao: "EZY", name: "easyJet", country: "UK" },
  { iata: "VY", icao: "VLG", name: "Vueling", country: "Spain" },
  { iata: "W6", icao: "WZZ", name: "Wizz Air", country: "Hungary" },
  { iata: "D8", icao: "IBK", name: "Norwegian Air", country: "Norway" },
  { iata: "FZ", icao: "FDB", name: "flydubai", country: "UAE" },
  { iata: "WY", icao: "OMA", name: "Oman Air", country: "Oman" },
  { iata: "GF", icao: "GFA", name: "Gulf Air", country: "Bahrain" },
  { iata: "SV", icao: "SVA", name: "Saudi Arabian Airlines", country: "Saudi Arabia" },
  { iata: "XY", icao: "KNE", name: "flynas", country: "Saudi Arabia" },
  { iata: "PC", icao: "PGT", name: "Pegasus Airlines", country: "Turkey" },
  { iata: "AK", icao: "AXM", name: "AirAsia", country: "Malaysia" },
  { iata: "MH", icao: "MAS", name: "Malaysia Airlines", country: "Malaysia" },
  { iata: "BI", icao: "RBA", name: "Royal Brunei", country: "Brunei" },
  { iata: "PK", icao: "PIA", name: "Pakistan International", country: "Pakistan" },
  { iata: "BG", icao: "BBC", name: "Biman Bangladesh", country: "Bangladesh" },
  { iata: "UL", icao: "ALK", name: "SriLankan Airlines", country: "Sri Lanka" },
];

export function getAirlineByIATA(iata: string): Airline | undefined {
  return AIRLINES.find(airline => airline.iata.toLowerCase() === iata.toLowerCase());
}

export function searchAirlines(query: string): Airline[] {
  const lowerQuery = query.toLowerCase();
  return AIRLINES.filter(airline => 
    airline.name.toLowerCase().includes(lowerQuery) ||
    airline.iata.toLowerCase().includes(lowerQuery) ||
    airline.icao.toLowerCase().includes(lowerQuery)
  );
}

