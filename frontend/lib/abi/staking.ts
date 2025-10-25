export const stakingAbi = [
  {
    "type": "function",
    "name": "stake",
    "inputs": [{ "name": "amount", "type": "uint256" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "unstake",
    "inputs": [{ "name": "amount", "type": "uint256" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "claimYield",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "stakingPositions",
    "inputs": [{ "name": "user", "type": "address" }],
    "outputs": [
      { "name": "amount", "type": "uint256" },
      { "name": "timestamp", "type": "uint256" },
      { "name": "tier", "type": "uint256" },
      { "name": "active", "type": "bool" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getStakingInfo",
    "inputs": [{ "name": "user", "type": "address" }],
    "outputs": [
      { "name": "amount", "type": "uint256" },
      { "name": "tier", "type": "uint256" },
      { "name": "pendingYield", "type": "uint256" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getTierInfo",
    "inputs": [{ "name": "tier", "type": "uint256" }],
    "outputs": [
      { "name": "minAmount", "type": "uint256" },
      { "name": "freeInsurance", "type": "uint256" },
      { "name": "name", "type": "string" },
      { "name": "active", "type": "bool" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "Staked",
    "inputs": [
      { "name": "user", "type": "address", "indexed": true },
      { "name": "amount", "type": "uint256", "indexed": false },
      { "name": "tier", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "TierUpgraded",
    "inputs": [
      { "name": "user", "type": "address", "indexed": true },
      { "name": "oldTier", "type": "uint256", "indexed": false },
      { "name": "newTier", "type": "uint256", "indexed": false }
    ]
  }
] as const;

