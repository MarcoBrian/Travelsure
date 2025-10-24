// Minimal ABI subset needed by the frontend
export const policyManagerAbi = [
  { "type": "function", "stateMutability": "view", "name": "payoutAmount", "inputs": [], "outputs": [{ "type": "uint256" }] },
  { "type": "function", "stateMutability": "view", "name": "probBps", "inputs": [], "outputs": [{ "type": "uint16" }] },
  { "type": "function", "stateMutability": "view", "name": "marginBps", "inputs": [], "outputs": [{ "type": "uint16" }] },
  {
    "type": "function",
    "stateMutability": "view",
    "name": "getTierConfig",
    "inputs": [{ "name": "_tier", "type": "uint8" }],
    "outputs": [
      { "name": "basePayout", "type": "uint256" },
      { "name": "premiumMultiplierBps", "type": "uint16" },
      { "name": "thresholdMinutes", "type": "uint64" },
      { "name": "probBps", "type": "uint16" },
      { "name": "marginBps", "type": "uint16" },
      { "name": "active", "type": "bool" }
    ]
  },
  {
    "type": "function",
    "stateMutability": "view",
    "name": "getTierPricing",
    "inputs": [{ "name": "_tier", "type": "uint8" }],
    "outputs": [
      { "name": "premium", "type": "uint256" },
      { "name": "payout", "type": "uint256" },
      { "name": "threshold", "type": "uint64" }
    ]
  },
  {
    "type": "function",
    "stateMutability": "view",
    "name": "policyCountOf",
    "inputs": [{ "name": "user", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256" }]
  },
  {
    "type": "function",
    "stateMutability": "view",
    "name": "policyIdOfOwnerByIndex",
    "inputs": [
      { "name": "user", "type": "address" },
      { "name": "i", "type": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "uint256" }]
  },
  {
    "type": "function",
    "stateMutability": "view",
    "name": "policies",
    "inputs": [{ "name": "", "type": "uint256" }],
    "outputs": [
      { "name": "holder", "type": "address" },
      { "name": "flightHash", "type": "bytes32" },
      { "name": "departureTime", "type": "uint64" },
      { "name": "expiry", "type": "uint64" },
      { "name": "thresholdMinutes", "type": "uint64" },
      { "name": "premium", "type": "uint256" },
      { "name": "payout", "type": "uint256" },
      { "name": "status", "type": "uint8" },
      { "name": "tier", "type": "uint8" },
      { "name": "departure", "type": "string" },
      { "name": "arrival", "type": "string" }
    ]
  },
  {
    "type": "function",
    "stateMutability": "nonpayable",
    "name": "buyPolicy",
    "inputs": [
      { "name": "p", "type": "tuple", "components": [
        { "name": "flightHash", "type": "bytes32" },
        { "name": "departureTime", "type": "uint64" },
        { "name": "departure", "type": "string" },
        { "name": "arrival", "type": "string" }
      ]},
      { "name": "tier", "type": "uint8" }
    ],
    "outputs": [{ "type": "uint256" }]
  }
] as const;

export type PolicyStruct = {
  holder: `0x${string}`
  flightHash: `0x${string}`
  departureTime: bigint
  expiry: bigint
  thresholdMinutes: bigint
  premium: bigint
  payout: bigint
  status: number
  tier: number
  departure: string
  arrival: string
}


