"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AIRLINES, getAirlineByIATA, searchAirlines, type Airline } from "@/lib/airlines"
import { Plane, Calendar, Shield, TrendingUp, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import axios from "axios"

interface FlightSchedule {
  request: {
    carrier: {
      requestedCode: string;
      fsCode: string;
    };
    flightNumber: {
      requested: string;
      interpreted: string;
    };
    departing: boolean;
    date: {
      year: string;
      month: string;
      day: string;
      interpreted: string;
    };
  };
  scheduledFlights: Array<{
    carrierFsCode: string;
    flightNumber: string;
    departureAirportFsCode: string;
    arrivalAirportFsCode: string;
    departureTime: string;
    arrivalTime: string;
    stops: number;
    arrivalTerminal?: string;
    departureTerminal?: string;
    flightEquipmentIataCode?: string;
  }>;
  appendix: {
    airlines: Array<{
      fs: string;
      iata: string;
      icao: string;
      name: string;
      active: boolean;
    }>;
    airports: Array<{
      fs: string;
      iata: string;
      icao: string;
      name: string;
      city: string;
      countryCode: string;
      latitude: number;
      longitude: number;
    }>;
    equipments: Array<{
      iata: string;
      name: string;
      jet: boolean;
    }>;
  };
}

interface QuoteResponse {
  premium: number;
  payouts: {
    delayed: number;
    cancelled: number;
    diverted: number;
  };
  ontimepercent: number;
  statistics: number[];
}

export function FlightInsuranceForm() {
  const [step, setStep] = useState<"input" | "quote" | "purchase">("input")
  
  // Form inputs
  const [airlineQuery, setAirlineQuery] = useState("")
  const [selectedAirline, setSelectedAirline] = useState<Airline | null>(null)
  const [showAirlineDropdown, setShowAirlineDropdown] = useState(false)
  const [flightNumber, setFlightNumber] = useState("")
  const [departureDate, setDepartureDate] = useState("")
  
  // Flight data
  const [flightSchedule, setFlightSchedule] = useState<FlightSchedule | null>(null)
  const [quote, setQuote] = useState<QuoteResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter airlines based on search
  const filteredAirlines = airlineQuery.length > 0 
    ? searchAirlines(airlineQuery).slice(0, 10)
    : []

  // Auto-select airline if exact match
  useEffect(() => {
    if (airlineQuery.length === 2) {
      const airline = getAirlineByIATA(airlineQuery)
      if (airline) {
        setSelectedAirline(airline)
        setShowAirlineDropdown(false)
      }
    }
  }, [airlineQuery])

  const fetchFlightData = async () => {
    if (!selectedAirline || !flightNumber || !departureDate) {
      setError("Please fill in all fields")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch flight schedule and quote in parallel using Next.js API routes (proxy)
      const [scheduleResponse, quoteResponse] = await Promise.all([
        axios.get<FlightSchedule>(
          `/api/flight-schedule`,
          {
            params: {
              airline: selectedAirline.iata,
              flightNumber: flightNumber,
              date: departureDate
            },
            timeout: 15000,
            headers: {
              'Accept': 'application/json',
            }
          }
        ),
        axios.get<QuoteResponse>(
          `/api/flight-quote`,
          {
            params: {
              airline: selectedAirline.iata,
              flightNumber: flightNumber
            },
            timeout: 15000,
            headers: {
              'Accept': 'application/json',
            }
          }
        )
      ])

      const scheduleData = scheduleResponse.data
      const quoteData = quoteResponse.data

      // Validate response
      if (!scheduleData.scheduledFlights || scheduleData.scheduledFlights.length === 0) {
        setError(`No flights found for ${selectedAirline.name} ${flightNumber} on ${departureDate}. Please check the flight number and date.`)
        return
      }

      setFlightSchedule(scheduleData)
      setQuote(quoteData)
      setStep("quote")
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.code === 'ECONNABORTED') {
          setError("Request timed out. Please try again.")
        } else if (err.response?.status === 404) {
          setError("Flight not found. Please verify the airline code, flight number, and date.")
        } else if (err.response?.status === 429) {
          setError("Too many requests. Please wait a moment and try again.")
        } else {
          setError(`Failed to fetch flight data: ${err.message}`)
        }
      } else {
        setError("An unexpected error occurred. Please try again.")
      }
      console.error("Flight data fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  const formatUSDC = (amount: number) => {
    return (amount / 1_000_000).toFixed(2)
  }

  const formatPercent = (decimal: number) => {
    return (decimal * 100).toFixed(0)
  }

  const getDepartureAirport = () => {
    if (!flightSchedule?.scheduledFlights?.[0]) return null
    const airportCode = flightSchedule.scheduledFlights[0].departureAirportFsCode
    return flightSchedule.appendix.airports.find(a => a.fs === airportCode)
  }

  const getArrivalAirport = () => {
    if (!flightSchedule?.scheduledFlights?.[0]) return null
    const airportCode = flightSchedule.scheduledFlights[0].arrivalAirportFsCode
    return flightSchedule.appendix.airports.find(a => a.fs === airportCode)
  }

  const formatTime = (isoString: string) => {
    return isoString.slice(11, 16)
  }

  const handlePurchase = () => {
    setStep("purchase")
    // Here you would integrate with the smart contract to purchase insurance
  }

  const resetForm = () => {
    setStep("input")
    setAirlineQuery("")
    setSelectedAirline(null)
    setFlightNumber("")
    setDepartureDate("")
    setFlightSchedule(null)
    setQuote(null)
    setError(null)
  }

  return (
    <div className="w-full">
      {step === "input" && (
        <Card className="bg-white/95 backdrop-blur-lg border-blue-100 shadow-2xl overflow-hidden">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-blue-900">
                  Etherisc Flight Delay Protection
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  Enter airline, flight number, and departure date to get a quote for flight delay protection.
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-red-800 text-sm font-medium">Error</p>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Airline Selector */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Airline
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={selectedAirline ? `${selectedAirline.name} (${selectedAirline.iata})` : airlineQuery}
                    onChange={(e) => {
                      setAirlineQuery(e.target.value)
                      setSelectedAirline(null)
                      setShowAirlineDropdown(true)
                      setError(null)
                    }}
                    onFocus={() => setShowAirlineDropdown(true)}
                    onBlur={() => setTimeout(() => setShowAirlineDropdown(false), 200)}
                    placeholder="Search airline or enter code..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                  {showAirlineDropdown && filteredAirlines.length > 0 && (
                    <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredAirlines.map((airline) => (
                        <button
                          key={airline.iata}
                          type="button"
                          onClick={() => {
                            setSelectedAirline(airline)
                            setAirlineQuery("")
                            setShowAirlineDropdown(false)
                            setError(null)
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors flex items-center justify-between border-b border-gray-100 last:border-b-0"
                        >
                          <span className="font-medium text-gray-900">{airline.name}</span>
                          <span className="text-sm text-gray-500 font-mono">{airline.iata}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedAirline && (
                  <p className="text-xs text-blue-600 mt-1.5 font-medium">
                    ✓ {selectedAirline.country} • {selectedAirline.icao}
                  </p>
                )}
              </div>

              {/* Flight Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Flight number
                </label>
                <input
                  type="text"
                  value={flightNumber}
                  onChange={(e) => {
                    setFlightNumber(e.target.value.replace(/\D/g, ''))
                    setError(null)
                  }}
                  placeholder="1011"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
                {flightNumber && (
                  <p className="text-xs text-blue-600 mt-1.5 font-medium">
                    ✓ {selectedAirline?.iata || ''}{flightNumber}
                  </p>
                )}
              </div>

              {/* Departure Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Departure date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={departureDate}
                    onChange={(e) => {
                      setDepartureDate(e.target.value)
                      setError(null)
                    }}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <Button
              onClick={fetchFlightData}
              disabled={!selectedAirline || !flightNumber || !departureDate || loading}
              className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  Fetching Flight Data...
                </>
              ) : (
                <>
                  <Plane className="w-5 h-5 mr-2" />
                  Get Quote
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {step === "quote" && flightSchedule && quote && (
        <Card className="bg-white/95 backdrop-blur-lg border-blue-100 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-8">
            {/* Flight Information Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Flight Details</h3>
                <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold text-green-700">
                    On-time {formatPercent(quote.ontimepercent)}%
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                {/* Departure */}
                <div className="text-center flex-1">
                  <p className="text-3xl font-bold text-gray-900">
                    {getDepartureAirport()?.city || 'Unknown'}
                  </p>
                  <p className="text-lg text-gray-500 mt-1 font-medium">
                    {getDepartureAirport()?.iata || ''}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    {getDepartureAirport()?.name}
                  </p>
                  <div className="mt-4 inline-block bg-blue-50 px-4 py-2 rounded-lg">
                    <p className="text-xs text-gray-500">Departure</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {formatTime(flightSchedule.scheduledFlights[0].departureTime)}
                    </p>
                  </div>
                </div>

                {/* Flight Path */}
                <div className="flex flex-col items-center px-8 flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-px w-20 bg-gradient-to-r from-transparent via-blue-300 to-blue-400"></div>
                    <div className="relative">
                      <Plane className="w-8 h-8 text-blue-600 animate-pulse" />
                    </div>
                    <div className="h-px w-20 bg-gradient-to-r from-blue-400 via-blue-300 to-transparent"></div>
                  </div>
                  <div className="bg-blue-600 px-6 py-2 rounded-full shadow-lg">
                    <p className="text-xl font-bold text-white">
                      {selectedAirline?.iata} {flightNumber}
                    </p>
                  </div>
                  {flightSchedule.scheduledFlights[0].flightEquipmentIataCode && (
                    <p className="text-xs text-gray-500 mt-3">
                      {flightSchedule.appendix.equipments.find(
                        e => e.iata === flightSchedule.scheduledFlights[0].flightEquipmentIataCode
                      )?.name || 'Aircraft'}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {flightSchedule.scheduledFlights[0].stops === 0 ? 'Non-stop' : `${flightSchedule.scheduledFlights[0].stops} stop(s)`}
                  </p>
                </div>

                {/* Arrival */}
                <div className="text-center flex-1">
                  <p className="text-3xl font-bold text-gray-900">
                    {getArrivalAirport()?.city || 'Unknown'}
                  </p>
                  <p className="text-lg text-gray-500 mt-1 font-medium">
                    {getArrivalAirport()?.iata || ''}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    {getArrivalAirport()?.name}
                  </p>
                  <div className="mt-4 inline-block bg-purple-50 px-4 py-2 rounded-lg">
                    <p className="text-xs text-gray-500">Arrival</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {formatTime(flightSchedule.scheduledFlights[0].arrivalTime)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Coverage Options */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Coverage Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border-2 border-blue-200 hover:border-blue-400 transition-all hover:shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-blue-900 uppercase">Delay (&gt;45min)</h4>
                    <AlertCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-4xl font-bold text-blue-900 mb-2">
                    ${formatUSDC(quote.payouts.delayed)}
                  </p>
                  <p className="text-xs text-blue-700 font-medium">USDC Payout</p>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl border-2 border-red-200 hover:border-red-400 transition-all hover:shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-red-900 uppercase">Cancellation</h4>
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <p className="text-4xl font-bold text-red-900 mb-2">
                    ${formatUSDC(quote.payouts.cancelled)}
                  </p>
                  <p className="text-xs text-red-700 font-medium">USDC Payout</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border-2 border-purple-200 hover:border-purple-400 transition-all hover:shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-purple-900 uppercase">Diversion</h4>
                    <AlertCircle className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-4xl font-bold text-purple-900 mb-2">
                    ${formatUSDC(quote.payouts.diverted)}
                  </p>
                  <p className="text-xs text-purple-700 font-medium">USDC Payout</p>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl mb-8 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-gray-700" />
                <h4 className="font-bold text-gray-900">Historical Performance</h4>
                <span className="text-xs text-gray-500 ml-auto">Last 68 flights</span>
              </div>
              <div className="grid grid-cols-6 gap-3">
                {['On-time', 'Delayed', 'Cancelled', 'Diverted', 'Unknown', 'Other'].map((label, idx) => (
                  <div key={idx} className="text-center">
                    <div className="bg-white p-4 rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-all hover:shadow-md">
                      <p className="text-3xl font-bold text-gray-900">{quote.statistics[idx]}</p>
                    </div>
                    <p className="text-xs text-gray-600 mt-2 font-medium">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Purchase Button */}
            <div className="flex items-center justify-between gap-4">
              <Button
                onClick={resetForm}
                variant="outline"
                className="px-8 py-6 text-lg font-semibold hover:bg-gray-100"
              >
                ← Back
              </Button>
              <Button
                onClick={handlePurchase}
                className="flex-1 py-6 text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-xl hover:shadow-2xl transition-all"
              >
                <Shield className="w-6 h-6 mr-3" />
                Buy for ${formatUSDC(quote.premium)} USDC
              </Button>
            </div>

            <p className="text-center text-sm text-gray-500 mt-4">
              Purchase flight delay protection with <span className="font-bold text-blue-600">USDC</span> on the{" "}
              <span className="font-bold text-blue-600">Base blockchain</span>.
            </p>
          </div>
        </Card>
      )}

      {step === "purchase" && (
        <Card className="bg-white/95 backdrop-blur-lg border-green-100 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
          <div className="p-12 text-center">
            <div className="inline-flex p-6 bg-green-100 rounded-full mb-6 animate-in zoom-in-50 duration-700">
              <CheckCircle2 className="w-20 h-20 text-green-600" />
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4 animate-in slide-in-from-bottom-4">
              Purchase Initiated!
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
              Your wallet will prompt you to confirm the transaction. Once confirmed, your flight insurance policy will be active.
            </p>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-2xl mb-8 border-2 border-blue-200">
              <p className="text-sm text-gray-600 mb-3 uppercase tracking-wide font-semibold">Policy Details</p>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Plane className="w-6 h-6 text-blue-600" />
                <p className="text-2xl font-bold text-blue-900">
                  {selectedAirline?.name}
                </p>
              </div>
              <p className="text-xl font-semibold text-blue-800 mb-1">
                {selectedAirline?.iata} {flightNumber}
              </p>
              <p className="text-gray-600 mb-4">{departureDate}</p>
              <div className="border-t-2 border-blue-200 pt-4 mt-4">
                <p className="text-sm text-gray-500 mb-1">Premium</p>
                <p className="text-3xl font-bold text-blue-900">
                  ${quote && formatUSDC(quote.premium)} USDC
                </p>
              </div>
            </div>
            <Button
              onClick={resetForm}
              size="lg"
              className="px-12 py-6 text-lg font-semibold"
            >
              Create Another Policy
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
