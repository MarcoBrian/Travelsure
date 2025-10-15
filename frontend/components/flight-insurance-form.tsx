"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AIRLINES, getAirlineByIATA, searchAirlines, type Airline } from "@/lib/airlines"
import { Plane, Calendar, Shield, TrendingUp, AlertCircle, CheckCircle2, Loader2, Clock, MapPin } from "lucide-react"
import axios from "axios"
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from "wagmi"
import { CONTRACTS } from "@/lib/contracts"
import { erc20Abi } from "@/lib/abi/erc20"
import { policyManagerAbi } from "@/lib/abi/policyManager"

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
  const { address, chainId } = useAccount()
  const chainKey = chainId === 31337 ? "localhost" : undefined
  const policyManager = chainKey ? CONTRACTS[chainKey].policyManager : undefined
  const pyusd = chainKey ? CONTRACTS[chainKey].pyusd : undefined

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

  // On-chain pricing params
  const { data: payoutAmount } = useReadContract({
    abi: policyManagerAbi,
    address: policyManager as `0x${string}` | undefined,
    functionName: "payoutAmount",
    query: { enabled: Boolean(policyManager) }
  }) as { data: bigint | undefined }
  const { data: probBps } = useReadContract({
    abi: policyManagerAbi,
    address: policyManager as `0x${string}` | undefined,
    functionName: "probBps",
    query: { enabled: Boolean(policyManager) }
  }) as { data: number | undefined }
  const { data: marginBps } = useReadContract({
    abi: policyManagerAbi,
    address: policyManager as `0x${string}` | undefined,
    functionName: "marginBps",
    query: { enabled: Boolean(policyManager) }
  }) as { data: number | undefined }

  const onChainPremium = useMemo(() => {
    if (!payoutAmount || probBps == null || marginBps == null) return undefined
    const base = (payoutAmount * BigInt(probBps)) / BigInt(10_000)
    return (base * BigInt(10_000 + marginBps)) / BigInt(10_000)
  }, [payoutAmount, probBps, marginBps])

  // Approve and buy
  const { writeContract, data: txHash } = useWriteContract()
  const { isLoading: isMinedPending, isSuccess: isMined } = useWaitForTransactionReceipt({ hash: txHash })

  // Simple purchase phase state to orchestrate approve -> buy -> done
  const [purchasePhase, setPurchasePhase] = useState<"idle" | "approving" | "buying" | "done">("idle")

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

  // Auto-fetch when all fields are filled
  useEffect(() => {
    const fetchData = async () => {
      if (selectedAirline && flightNumber && departureDate && !loading) {
        await fetchFlightData()
      }
    }

    // Debounce to avoid too many requests
    const timer = setTimeout(() => {
      fetchData()
    }, 800)

    return () => clearTimeout(timer)
  }, [selectedAirline, flightNumber, departureDate])

  const fetchFlightData = async () => {
    if (!selectedAirline || !flightNumber || !departureDate) {
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
          setError("Flight not found. Please verify the details.")
        } else if (err.response?.status === 429) {
          setError("Too many requests. Please wait a moment.")
        } else {
          setError(`Unable to fetch flight data.`)
        }
      } else {
        setError("An unexpected error occurred.")
      }
      console.error("Flight data fetch error:", err)
      setStep("input")
    } finally {
      setLoading(false)
    }
  }

  const formatUSDC = (amount: number) => {
    return (amount / 1_000_000).toFixed(2)
  }
  const formatTokenBn = (amount?: bigint) => {
    if (amount == null) return "—"
    return (Number(amount) / 1_000_000).toFixed(2)
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

  const handlePurchase = async () => {
    try {
      if (!address || !policyManager || !pyusd || !onChainPremium || !flightSchedule || !selectedAirline) return
      const departureIso = flightSchedule.scheduledFlights[0].departureTime
      const departureTs = Math.floor(new Date(departureIso).getTime() / 1000)
      const flightHash = (() => {
        const encoder = new TextEncoder()
        const bytes = encoder.encode(`${selectedAirline.iata}-${flightNumber}-${departureDate}`)
        // Simple hash substitute: keccak not in browser. We'll pass bytes32 as 0x0 until we wire hashing util.
        return "0x" + Buffer.from(bytes).toString("hex").slice(0, 64).padEnd(64, "0") as `0x${string}`
      })()

      // 1) Approve PYUSD
      writeContract({
        abi: erc20Abi,
        address: pyusd as `0x${string}`,
        functionName: "approve",
        args: [policyManager as `0x${string}`, onChainPremium]
      })
      setPurchasePhase("approving")
    } catch (e) {
      console.error(e)
    }
  }

  // After approval mined, send buyPolicy
  useEffect(() => {
    if (!isMined || !policyManager || !selectedAirline || !flightSchedule || !onChainPremium) return
    if (purchasePhase === "approving") {
      const departureIso = flightSchedule.scheduledFlights[0].departureTime
      const departureTs = Math.floor(new Date(departureIso).getTime() / 1000)
      const flightHash = (() => {
        const encoder = new TextEncoder()
        const bytes = encoder.encode(`${selectedAirline.iata}-${flightNumber}-${departureDate}`)
        return "0x" + Buffer.from(bytes).toString("hex").slice(0, 64).padEnd(64, "0") as `0x${string}`
      })()
      writeContract({
        abi: policyManagerAbi,
        address: policyManager as `0x${string}`,
        functionName: "buyPolicy",
        args: [{ flightHash, departureTime: BigInt(departureTs) }]
      })
      setPurchasePhase("buying")
      return
    }
    if (purchasePhase === "buying") {
      setPurchasePhase("done")
      setStep("purchase")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMined])

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
    <div className="w-full space-y-6">
      {/* Input Form - Always visible at top */}
      <Card className="bg-white/95 backdrop-blur-lg border-blue-100 shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Travelsure - Insurance 
              </h2>
              <p className="text-blue-100 text-sm mt-0.5">
                Powered by PYUSD
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-800 text-sm font-medium">Unable to load flight</p>
                <p className="text-red-700 text-sm mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Airline Selector */}
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
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
                  placeholder="Type airline name or code..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                />
                {showAirlineDropdown && filteredAirlines.length > 0 && (
                  <div className="absolute z-20 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
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
                        <span className="font-semibold text-gray-900">{airline.name}</span>
                        <span className="text-sm text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">{airline.iata}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedAirline && (
                <p className="text-xs text-blue-600 mt-2 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {selectedAirline.country}
                </p>
              )}
            </div>

            {/* Flight Number */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Flight Number
              </label>
              <input
                type="text"
                value={flightNumber}
                onChange={(e) => {
                  setFlightNumber(e.target.value.replace(/\D/g, ''))
                  setError(null)
                }}
                placeholder="1011"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900 placeholder:text-gray-400"
              />
              {flightNumber && (
                <p className="text-xs text-blue-600 mt-2 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {selectedAirline?.iata || ''} {flightNumber}
                </p>
              )}
            </div>

            {/* Departure Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Departure Date
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
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Loading indicator */}
          {loading && (
            <div className="mt-6 flex items-center justify-center gap-3 text-blue-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Fetching flight details...</span>
            </div>
          )}
        </div>
      </Card>

      {/* Quote Display */}
      {step === "quote" && flightSchedule && quote && (
        <Card className="bg-white/95 backdrop-blur-lg border-blue-100 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
          {/* Flight Route Header */}
          <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-8 border-b-2 border-blue-100">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              {/* Departure */}
              <div className="text-center flex-1">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-3">
                  <MapPin className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {getDepartureAirport()?.city || 'Unknown'}
                </p>
                <p className="text-lg text-blue-600 font-bold mb-2">
                  {getDepartureAirport()?.iata || ''}
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  {getDepartureAirport()?.name}
                </p>
                <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-2xl font-bold text-gray-900">
                    {formatTime(flightSchedule.scheduledFlights[0].departureTime)}
                  </span>
                </div>
              </div>

              {/* Flight Path */}
              <div className="flex flex-col items-center px-12 flex-1">
                <div className="relative w-full">
                  <div className="h-1 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-600 rounded-full mb-4"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="bg-white p-3 rounded-full shadow-lg border-2 border-blue-500">
                      <Plane className="w-8 h-8 text-blue-600 rotate-90" />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 rounded-full shadow-lg mt-4">
                  <p className="text-xl font-bold text-white">
                    {selectedAirline?.iata} {flightNumber}
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-2 bg-green-100 px-4 py-2 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-bold text-green-700">
                    On-time {formatPercent(quote.ontimepercent)}%
                  </span>
                </div>
                {flightSchedule.scheduledFlights[0].flightEquipmentIataCode && (
                  <p className="text-xs text-gray-500 mt-2">
                    {flightSchedule.appendix.equipments.find(
                      e => e.iata === flightSchedule.scheduledFlights[0].flightEquipmentIataCode
                    )?.name || 'Aircraft'}
                  </p>
                )}
              </div>

              {/* Arrival */}
              <div className="text-center flex-1">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-3">
                  <MapPin className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {getArrivalAirport()?.city || 'Unknown'}
                </p>
                <p className="text-lg text-blue-600 font-bold mb-2">
                  {getArrivalAirport()?.iata || ''}
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  {getArrivalAirport()?.name}
                </p>
                <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-2xl font-bold text-gray-900">
                    {formatTime(flightSchedule.scheduledFlights[0].arrivalTime)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8">
            {/* Coverage Options */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Coverage Options
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border-2 border-blue-200 hover:border-blue-400 transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-blue-200 rounded-full -mr-10 -mt-10 opacity-50"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-blue-900 uppercase tracking-wide">Delay &gt;45min</h4>
                      <div className="p-2 bg-blue-200 rounded-lg">
                        <Clock className="w-5 h-5 text-blue-700" />
                      </div>
                    </div>
                    <p className="text-4xl font-bold text-blue-900 mb-2">
                      ${formatTokenBn(payoutAmount)}
                    </p>
                    <p className="text-xs text-blue-700 font-semibold">PYUSD Payout</p>
                  </div>
                </div>

                <div className="group relative overflow-hidden bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-2xl border-2 border-red-200 hover:border-red-400 transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-red-200 rounded-full -mr-10 -mt-10 opacity-50"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-red-900 uppercase tracking-wide">Cancellation</h4>
                      <div className="p-2 bg-red-200 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-red-700" />
                      </div>
                    </div>
                    <p className="text-4xl font-bold text-red-900 mb-2">
                      ${formatTokenBn(payoutAmount)}
                    </p>
                    <p className="text-xs text-red-700 font-semibold">PYUSD Payout</p>
                  </div>
                </div>

                {/** Diversion option removed per request **/}
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-gradient-to-br from-gray-50 to-slate-100 p-6 rounded-2xl mb-8 border-2 border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-gray-200 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-gray-700" />
                </div>
                <h4 className="font-bold text-gray-900">Historical Performance</h4>
                <span className="text-xs text-gray-500 ml-auto bg-white px-3 py-1 rounded-full">
                  {(() => {
                    const total = (quote.statistics || []).reduce((sum, n) => sum + n, 0)
                    return `Last ${total} flights`
                  })()}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'On-time', index: 0 },
                  { label: 'Delayed', index: 1 },
                  { label: 'Cancelled', index: 2 },
                  { label: 'Diverted', index: 3 },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <div className="bg-white p-4 rounded-xl border-2 border-gray-200 hover:border-blue-400 transition-all hover:shadow-md">
                      <p className="text-3xl font-bold text-gray-900">{quote.statistics[item.index]}</p>
                    </div>
                    <p className="text-xs text-gray-600 mt-2 font-medium">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Purchase Button */}
            <div className="flex items-center justify-center gap-4">
              <Button
                onClick={handlePurchase}
                size="lg"
                disabled={!onChainPremium}
                className="px-12 py-8 text-2xl font-bold bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 shadow-2xl hover:shadow-blue-500/50 transition-all hover:scale-105 rounded-2xl text-white disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {purchasePhase === "approving" && "Approve in wallet..."}
                {purchasePhase === "buying" && "Purchasing..."}
                {purchasePhase === "done" && "Purchased"}
                {purchasePhase === "idle" && (
                  onChainPremium ? (
                    <>Buy Now - ${formatTokenBn(onChainPremium)} PYUSD</>
                  ) : (
                    <>Buy Now - calculating price...</>
                  )
                )}
              </Button>
            </div>

            <p className="text-center text-sm text-gray-500 mt-6">
              Secure payment with <span className="font-bold text-blue-600">PayPal PYUSD</span>
            </p>
          </div>
        </Card>
      )}

      {/* Purchase Confirmation */}
      {step === "purchase" && (
        <Card className="bg-white/95 backdrop-blur-lg border-green-100 shadow-2xl animate-in fade-in zoom-in-95 duration-500 overflow-hidden">
          <div className="p-12 text-center">
            <div className="inline-flex p-6 bg-gradient-to-br from-green-100 to-green-200 rounded-full mb-6 animate-in zoom-in-50 duration-700">
              <CheckCircle2 className="w-20 h-20 text-green-600" />
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4 animate-in slide-in-from-bottom-4">
              Insurance Purchased!
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
              Your policy is now active as an NFT in your wallet. You'll receive automatic payouts if your flight is disrupted.
            </p>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-2xl mb-8 border-2 border-blue-200 max-w-md mx-auto">
              <p className="text-sm text-gray-600 mb-3 uppercase tracking-wide font-semibold">Policy NFT</p>
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
                <p className="text-sm text-gray-500 mb-1">Premium Paid</p>
                <p className="text-3xl font-bold text-blue-900">
                  ${formatTokenBn(onChainPremium)} PYUSD
                </p>
              </div>
            </div>
            <Button
              onClick={resetForm}
              size="lg"
              className="px-12 py-6 text-lg font-semibold"
            >
              Purchase Another Policy
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
