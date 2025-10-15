"use client"

import { useAccount, useReadContract } from "wagmi"
import { CONTRACTS } from "@/lib/contracts"
import { erc20Abi } from "@/lib/abi/erc20"
import { policyManagerAbi, type PolicyStruct } from "@/lib/abi/policyManager"

function formatStatus(status: number): string {
  switch (status) {
    case 1: return "Active"
    case 2: return "Claimable"
    case 3: return "PaidOut"
    case 4: return "Expired"
    default: return "None"
  }
}

function statusDotClass(status: number): string {
  switch (status) {
    case 1: return "bg-green-500"        // Active
    case 2: return "bg-amber-500"        // Claimable threshold met
    case 3: return "bg-emerald-600"      // PaidOut
    case 4: return "bg-gray-400"         // Expired
    default: return "bg-gray-300"        // None/unknown
  }
}

export function MyInsurance() {
  const { address, chainId } = useAccount()

  if (!address) {
    return <div className="text-sm text-gray-600">Connect your wallet to view policies.</div>
  }

  const chainKey = chainId === 31337 ? "localhost" : undefined
  const contractAddress = chainKey ? CONTRACTS[chainKey].policyManager : undefined
  const pyusdAddress = chainKey ? CONTRACTS[chainKey].pyusd : undefined

  const { data: pyusdDecimals } = useReadContract({
    abi: erc20Abi,
    address: pyusdAddress as `0x${string}` | undefined,
    functionName: "decimals",
    query: { enabled: Boolean(pyusdAddress) }
  }) as { data: number | undefined }

  const { data: count } = useReadContract({
    abi: policyManagerAbi,
    address: contractAddress as `0x${string}` | undefined,
    functionName: "policyCountOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && contractAddress) }
  }) as { data: bigint | undefined }

  if (!contractAddress) {
    return <div className="text-sm text-gray-600">Unsupported network. Switch to localhost.</div>
  }

  const ZERO = BigInt(0)
  const TEN = BigInt(10)

  if (!count || count === ZERO) {
    return (
      <div className="text-center text-gray-600">
        <p className="mb-2">You have no policies yet.</p>
        <p className="text-sm">Buy your first policy in the "Buy insurance" tab.</p>
      </div>
    )
  }

  // For simplicity and to stay concise, fetch first up to 10 policies individually.
  const max = count > TEN ? TEN : count
  const indices = Array.from({ length: Number(max) }, (_, i) => BigInt(i))

  return (
    <div className="space-y-3">
      {indices.map((i) => (
        <PolicyRow key={i.toString()} index={i} address={address} contractAddress={contractAddress} pyusdDecimals={pyusdDecimals ?? 6} />
      ))}
      {count > TEN && (
        <div className="text-xs text-gray-500">Showing first 10 of {count.toString()} policies</div>
      )}
    </div>
  )
}

function PolicyRow({ index, address, contractAddress, pyusdDecimals }: { index: bigint; address: `0x${string}`; contractAddress: `0x${string}`; pyusdDecimals: number }) {
  const { data: policyId } = useReadContract({
    abi: policyManagerAbi,
    address: contractAddress,
    functionName: "policyIdOfOwnerByIndex",
    args: [address, index]
  }) as { data: bigint | undefined }

  const { data: policy } = useReadContract({
    abi: policyManagerAbi,
    address: contractAddress,
    functionName: "policies",
    args: policyId ? [policyId] : undefined,
    query: { enabled: Boolean(policyId) }
  }) as { data: PolicyStruct | undefined }

  if (!policyId || !policy) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 animate-pulse h-20" />
    )
  }

  // viem returns tuple-like objects that are both arrays and objects with named keys.
  // Safely access fields by name or index to avoid undefined during variations.
  const getField = (obj: any, name: string, idx: number) => (obj?.[name] ?? obj?.[idx])
  const departureTime = getField(policy as any, "departureTime", 2) as bigint | undefined
  const thresholdMinutes = getField(policy as any, "thresholdMinutes", 4) as bigint | undefined
  const premium = getField(policy as any, "premium", 5) as bigint | undefined
  const payout = getField(policy as any, "payout", 6) as bigint | undefined
  const status = getField(policy as any, "status", 7) as number | undefined

  const formatPYUSD = (bn?: bigint) => {
    if (bn == null) return "—"
    const divisor = 10 ** pyusdDecimals
    return (Number(bn) / divisor).toFixed(2)
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="p-4 flex items-center justify-between">
        <div>
          <div className="font-medium text-gray-900">Policy #{policyId.toString()}</div>
          <div className="text-sm text-gray-600">Departs: {departureTime ? new Date(Number(departureTime) * 1000).toLocaleString() : "—"}</div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-800">Premium: {formatPYUSD(premium)} PYUSD</div>
          {(status === 2 || status === 3 || status === 4) && (
            <div className="text-sm font-medium text-green-700">Payout: {formatPYUSD(payout)} PYUSD</div>
          )}
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <span className={`inline-flex h-2.5 w-2.5 rounded-full ${statusDotClass(status ?? 0)}`} />
            Status: {formatStatus(status ?? 0)}
          </div>
        </div>
      </div>
      <div className="bg-blue-50 border-t border-blue-200 text-blue-800 text-xs px-3 py-2">
        <span className="font-semibold">Coverage:</span> You will receive {formatPYUSD(payout)} PYUSD if flight is delayed more than {thresholdMinutes ? Number(thresholdMinutes) : "—"} minutes
      </div>
    </div>
  )
}



