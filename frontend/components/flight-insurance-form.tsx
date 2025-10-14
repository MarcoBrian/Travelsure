"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AIRLINES, getAirlineByIATA, searchAirlines, type Airline } from "@/lib/airlines"
import { Plane, Calendar, Shield, TrendingUp, AlertCircle, CheckCircle2, Loader2, Clock, MapPin, Search, ArrowRight, Sparkles, Zap, Award } from "lucide-react"
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

  // Refs for auto-focus
  const airlineInputRef = useRef<HTMLInputElement>(null)
  const flightNumberRef = useRef<HTMLInputElement>(null)
  const dateRef = useRef<HTMLInputElement>(null)

  // Auto-focus on airline input when component mounts
  useEffect(() => {
    if (airlineInputRef.current) {
      airlineInputRef.current.focus()
    }
  }, [])

  // Filter airlines based on search
  const filteredAirlines = airlineQuery.length > 0 
    ? searchAirlines(airlineQuery).slice(0, 8)
    : []

  // Auto-select airline if exact match
  useEffect(() => {
    if (airlineQuery.length === 2) {
      const airline = getAirlineByIATA(airlineQuery)
      if (airline) {
        setSelectedAirline(airline)
        setShowAirlineDropdown(false)
        setTimeout(() => flightNumberRef.current?.focus(), 100)
      }
    }
  }, [airlineQuery])

  // Auto-fetch when all fields are filled
  useEffect(() => {
    const fetchData = async () => {
      if (selectedAirline && flightNumber && departureDate && !loading) {
        await fetchFlightData()
      }
    }

    const timer = setTimeout(() => {
      fetchData()
    }, 1000)

    return () => clearTimeout(timer)
  }, [selectedAirline, flightNumber, departureDate])

  const fetchFlightData = async () => {
    if (!selectedAirline || !flightNumber || !departureDate) {
      return
    }

    setLoading(true)
    setError(null)

    try {
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

      if (!scheduleData.scheduledFlights || scheduleData.scheduledFlights.length === 0) {
        setError(`No flights found for ${selectedAirline.name} ${flightNumber} on ${departureDate}.`)
        setStep("input")
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
          setError(`Flight ${selectedAirline.name} ${flightNumber} not found for ${departureDate}.`)
        } else if (err.response?.status === 429) {
          setError("Too many requests. Please wait a moment and try again.")
        } else {
          setError(err.response?.data?.message || "Failed to fetch flight data. Please try again.")
        }
      } else {
        setError("An unexpected error occurred. Please try again.")
      }
      setStep("input")
    } finally {
      setLoading(false)
    }
  }

  const handleAirlineSelect = (airline: Airline) => {
    setSelectedAirline(airline)
    setAirlineQuery(airline.name)
    setShowAirlineDropdown(false)
    setTimeout(() => flightNumberRef.current?.focus(), 100)
  }

  const handleFlightNumberChange = (value: string) => {
    setFlightNumber(value)
    if (value && value.length >= 2) {
      setTimeout(() => dateRef.current?.focus(), 100)
    }
  }

  const handleReset = () => {
    setStep("input")
    setFlightSchedule(null)
    setQuote(null)
    setError(null)
    setAirlineQuery("")
    setSelectedAirline(null)
    setFlightNumber("")
    setDepartureDate("")
    setTimeout(() => airlineInputRef.current?.focus(), 100)
  }

  if (step === "input") {
    return (
      <div className="w-full p-4">
        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                1
              </div>
              <span className="text-sm font-semibold text-gray-700">Flight Details</span>
            </div>
            <div className="w-16 h-0.5 bg-gray-300"></div>
            <div className="flex items-center gap-2 opacity-40">
              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold text-sm">
                2
              </div>
              <span className="text-sm font-medium text-gray-500">Quote</span>
            </div>
            <div className="w-16 h-0.5 bg-gray-300"></div>
            <div className="flex items-center gap-2 opacity-40">
              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold text-sm">
                3
              </div>
              <span className="text-sm font-medium text-gray-500">Purchase</span>
            </div>
          </div>
        </div>

        {/* Main Search Card */}
        <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-3xl shadow-xl border border-gray-200/50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600 px-8 py-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-white/10"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Get Your Quote</h2>
                  <p className="text-blue-100 text-sm mt-1">Enter your flight details below</p>
                </div>
              </div>
              <Sparkles className="w-8 h-8 text-yellow-300 animate-pulse" />
            </div>
          </div>

          {/* Search Form */}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Airline Search */}
              <div className="relative group">
                <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <Plane className="w-4 h-4 text-blue-600" />
                  Airline
                </label>
                <div className="relative">
                  <input
                    ref={airlineInputRef}
                    type="text"
                    value={airlineQuery}
                    onChange={(e) => {
                      setAirlineQuery(e.target.value)
                      setSelectedAirline(null)
                      setShowAirlineDropdown(true)
                    }}
                    onFocus={() => setShowAirlineDropdown(true)}
                    placeholder="Search airline..."
                    className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white shadow-sm hover:shadow-md"
                  />
                  <Search className="absolute right-4 top-4 w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  
                  {/* Dropdown */}
                  {showAirlineDropdown && filteredAirlines.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-2xl shadow-2xl z-50 max-h-80 overflow-y-auto animate-fade-in">
                      {filteredAirlines.map((airline) => (
                        <button
                          key={airline.iata}
                          onClick={() => handleAirlineSelect(airline)}
                          className="w-full px-5 py-4 text-left hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 border-b border-gray-100 last:border-b-0 transition-all duration-150 group"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{airline.name}</div>
                              <div className="text-sm text-gray-500 mt-0.5">{airline.country}</div>
                            </div>
                            <div className="text-sm font-mono font-bold text-blue-600 bg-blue-100 px-3 py-1.5 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              {airline.iata}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {selectedAirline && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-green-600 animate-fade-in">
                    <div className="p-1 bg-green-100 rounded-full">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="font-semibold">{selectedAirline.name} ({selectedAirline.iata})</span>
                  </div>
                )}
              </div>

              {/* Flight Number */}
              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-600" />
                  Flight Number
                </label>
                <div className="relative">
                  <input
                    ref={flightNumberRef}
                    type="text"
                    value={flightNumber}
                    onChange={(e) => handleFlightNumberChange(e.target.value.toUpperCase())}
                    placeholder="e.g., 1011"
                    className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white shadow-sm hover:shadow-md font-mono text-lg"
                  />
                  <div className="absolute right-4 top-4 w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors">
                    ✈️
                  </div>
                </div>
              </div>

              {/* Departure Date */}
              <div className="group">
                <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-pink-600" />
                  Departure Date
                </label>
                <div className="relative">
                  <input
                    ref={dateRef}
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-pink-500/20 focus:border-pink-500 transition-all duration-200 text-gray-900 bg-white shadow-sm hover:shadow-md"
                  />
                </div>
              </div>
            </div>

            {/* Search Button */}
            <div className="mt-8 flex justify-center">
              <Button
                onClick={fetchFlightData}
                disabled={!selectedAirline || !flightNumber || !departureDate || loading}
                className="px-10 py-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white rounded-2xl font-bold text-lg transition-all duration-300 disabled:opacity-50 shadow-xl hover:shadow-2xl hover:scale-105 transform"
              >
                {loading ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Searching Flights...
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Search className="w-5 h-5" />
                    Get Insurance Quote
                    <ArrowRight className="w-5 h-5" />
                  </div>
                )}
              </Button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-6 p-5 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl animate-fade-in">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-red-100 rounded-full">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-red-900 font-bold text-lg">Oops! Something went wrong</p>
                    <p className="text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="mt-6 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border-2 border-blue-200 rounded-2xl overflow-hidden animate-fade-in">
            <div className="p-8 text-center">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="relative">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                  <div className="absolute inset-0 w-10 h-10 animate-ping text-purple-400 opacity-20">
                    <Loader2 className="w-10 h-10" />
                  </div>
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Finding Your Flight...
                </span>
              </div>
              <p className="text-gray-600 text-lg">
                Gathering real-time flight data and calculating your personalized quote
              </p>
              <div className="mt-6 flex justify-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce animation-delay-200"></div>
                <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce animation-delay-400"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Quote step
  if (step === "quote" && flightSchedule && quote) {
    const flight = flightSchedule.scheduledFlights[0]
    const departureAirport = getDepartureAirport(flightSchedule)
    const arrivalAirport = getArrivalAirport(flightSchedule)

    return (
      <div className="w-full p-4 space-y-6">
        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                ✓
              </div>
              <span className="text-sm font-semibold text-gray-700">Flight Details</span>
            </div>
            <div className="w-16 h-0.5 bg-green-500"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                2
              </div>
              <span className="text-sm font-semibold text-gray-700">Quote</span>
            </div>
            <div className="w-16 h-0.5 bg-gray-300"></div>
            <div className="flex items-center gap-2 opacity-40">
              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold text-sm">
                3
              </div>
              <span className="text-sm font-medium text-gray-500">Purchase</span>
            </div>
          </div>
        </div>

        {/* Flight Details Card */}
        <div className="bg-gradient-to-br from-white to-green-50/30 rounded-3xl shadow-2xl border border-gray-200/50 overflow-hidden animate-fade-in">
          <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 px-8 py-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-white/10"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg animate-bounce-slow">
                  <CheckCircle2 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Flight Found! ✈️</h3>
                  <p className="text-green-100 text-sm mt-1">Your personalized quote is ready</p>
                </div>
              </div>
              <Button
                onClick={handleReset}
                variant="outline"
                size="sm"
                className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30 rounded-xl font-semibold shadow-lg"
              >
                New Search
              </Button>
            </div>
          </div>

          <div className="p-8">
            {/* Flight Info Banner */}
            <div className="mb-8 p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                    <Plane className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="font-bold text-2xl">
                      {selectedAirline?.name} {flightNumber}
                    </div>
                    <div className="text-blue-100 mt-1 text-lg">
                      {departureDate} • {formatTime(flight.departureTime)} - {formatTime(flight.arrivalTime)}
                    </div>
                  </div>
                </div>
                <div className="text-right bg-white/20 backdrop-blur-sm rounded-2xl p-4">
                  <div className="text-sm text-blue-100 mb-1">On-time Performance</div>
                  <div className="text-4xl font-black text-yellow-300">
                    {formatPercent(quote.ontimepercent)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Route Visualization */}
            <div className="mb-8 p-6 bg-gradient-to-r from-gray-50 to-blue-50 border-2 border-gray-200 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <div className="text-3xl font-black text-gray-900 mb-2">{departureAirport?.iata}</div>
                  <div className="text-sm font-semibold text-gray-600">{departureAirport?.city}</div>
                  <div className="text-xs text-gray-500 mt-1">{departureAirport?.name}</div>
                </div>
                <div className="flex-1 flex items-center justify-center px-8">
                  <div className="relative w-full">
                    <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"></div>
                    <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-3 rounded-full shadow-lg border-2 border-purple-500">
                      <Plane className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </div>
                <div className="text-center flex-1">
                  <div className="text-3xl font-black text-gray-900 mb-2">{arrivalAirport?.iata}</div>
                  <div className="text-sm font-semibold text-gray-600">{arrivalAirport?.city}</div>
                  <div className="text-xs text-gray-500 mt-1">{arrivalAirport?.name}</div>
                </div>
              </div>
            </div>

            {/* Coverage Options */}
            <div className="mb-8">
              <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6 text-blue-600" />
                Your Coverage
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Delay Coverage */}
                <div className="p-6 bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200 rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-105 transform group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 bg-orange-500 rounded-xl shadow-lg group-hover:animate-bounce">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="font-bold text-gray-900 text-lg">Flight Delay</h4>
                  </div>
                  <div className="text-4xl font-black text-orange-600 mb-2">
                    ${formatUSDC(quote.payouts.delayed)}
                  </div>
                  <div className="text-sm text-gray-700 font-medium">
                    Payout for delays over 2 hours
                  </div>
                </div>

                {/* Cancellation Coverage */}
                <div className="p-6 bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-105 transform group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 bg-red-500 rounded-xl shadow-lg group-hover:animate-bounce">
                      <AlertCircle className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="font-bold text-gray-900 text-lg">Cancellation</h4>
                  </div>
                  <div className="text-4xl font-black text-red-600 mb-2">
                    ${formatUSDC(quote.payouts.cancelled)}
                  </div>
                  <div className="text-sm text-gray-700 font-medium">
                    Full coverage for cancellations
                  </div>
                </div>

                {/* Diversion Coverage */}
                <div className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-105 transform group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 bg-purple-500 rounded-xl shadow-lg group-hover:animate-bounce">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="font-bold text-gray-900 text-lg">Diversion</h4>
                  </div>
                  <div className="text-4xl font-black text-purple-600 mb-2">
                    ${formatUSDC(quote.payouts.diverted)}
                  </div>
                  <div className="text-sm text-gray-700 font-medium">
                    Coverage for flight diversions
                  </div>
                </div>
              </div>
            </div>

            {/* Premium and Purchase */}
            <div className="p-8 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl border-2 border-blue-300 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="text-white">
                  <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
                    <Award className="w-7 h-7 text-yellow-300" />
                    Insurance Premium
                  </h3>
                  <p className="text-blue-100 text-lg">One-time payment • Full coverage • Instant payouts</p>
                </div>
                <div className="text-right bg-white/20 backdrop-blur-sm rounded-2xl p-6">
                  <div className="text-5xl font-black text-white mb-1">
                    ${formatUSDC(quote.premium)}
                  </div>
                  <div className="text-blue-100 font-bold text-lg">PYUSD</div>
                </div>
              </div>
              
              <Button
                onClick={() => setStep("purchase")}
                className="w-full py-6 bg-white text-purple-700 hover:bg-blue-50 rounded-2xl font-black text-xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 transform"
              >
                <div className="flex items-center justify-center gap-3">
                  <Shield className="w-6 h-6" />
                  Purchase Insurance Now
                  <ArrowRight className="w-6 h-6" />
                </div>
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Purchase success step
  if (step === "purchase") {
    return (
      <div className="w-full p-4">
        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                ✓
              </div>
              <span className="text-sm font-semibold text-gray-700">Flight Details</span>
            </div>
            <div className="w-16 h-0.5 bg-green-500"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                ✓
              </div>
              <span className="text-sm font-semibold text-gray-700">Quote</span>
            </div>
            <div className="w-16 h-0.5 bg-green-500"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                ✓
              </div>
              <span className="text-sm font-semibold text-gray-700">Purchase</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-green-50/30 rounded-3xl shadow-2xl border border-gray-200/50 overflow-hidden animate-fade-in">
          <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 px-8 py-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-white/10"></div>
            <div className="relative flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg animate-bounce">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Purchase Successful! 🎉</h3>
                <p className="text-green-100 text-sm mt-1">Your flight is now fully protected</p>
              </div>
            </div>
          </div>

          <div className="p-12 text-center">
            <div className="relative inline-block mb-8">
              <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-2xl animate-bounce-slow">
                <Shield className="w-12 h-12 text-white" />
              </div>
              <div className="absolute inset-0 w-24 h-24 bg-green-400 rounded-full animate-ping opacity-20 mx-auto"></div>
            </div>
            
            <h3 className="text-3xl font-black text-gray-900 mb-4">
              Insurance Active ✅
            </h3>
            <p className="text-gray-700 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
              Your <span className="font-bold text-blue-600">{selectedAirline?.name} {flightNumber}</span> flight on <span className="font-bold text-purple-600">{departureDate}</span> is now protected.
              You'll receive <span className="font-bold text-green-600">automatic payouts</span> if your flight is delayed, cancelled, or diverted.
            </p>

            <div className="flex gap-4 justify-center">
              <Button
                onClick={handleReset}
                variant="outline"
                className="px-8 py-4 rounded-2xl font-bold text-lg border-2 hover:shadow-xl transition-all"
              >
                Insure Another Flight
              </Button>
              <Button className="px-8 py-4 rounded-2xl font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-xl hover:shadow-2xl transition-all">
                View Policy Details
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

// Helper functions
const formatUSDC = (amount: number) => {
  return (amount / 1_000_000).toFixed(2)
}

const formatPercent = (decimal: number) => {
  return (decimal * 100).toFixed(0)
}

const getDepartureAirport = (flightSchedule: FlightSchedule | null) => {
  if (!flightSchedule?.scheduledFlights?.[0]) return null
  const airportCode = flightSchedule.scheduledFlights[0].departureAirportFsCode
  return flightSchedule.appendix.airports.find(a => a.fs === airportCode)
}

const getArrivalAirport = (flightSchedule: FlightSchedule | null) => {
  if (!flightSchedule?.scheduledFlights?.[0]) return null
  const airportCode = flightSchedule.scheduledFlights[0].arrivalAirportFsCode
  return flightSchedule.appendix.airports.find(a => a.fs === airportCode)
}

const formatTime = (isoString: string) => {
  return isoString.slice(11, 16)
}
