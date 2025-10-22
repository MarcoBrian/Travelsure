# Travelsure Smart Contracts

This project contains the smart contracts for Travelsure, a decentralized flight delay insurance platform powered by blockchain technology and Chainlink oracles.

## Project Overview

Travelsure revolutionizes travel insurance by providing instant, automated payouts for flight delays using smart contracts. The platform eliminates traditional claims processes and paperwork, offering transparent, on-chain insurance policies.

### Key Features

- **Automated Payouts**: Instant payouts when flight delays are verified by Chainlink oracles
- **Multi-Tier Policies**: Basic, Silver, Gold, and Platinum coverage options
- **Transparent Terms**: All policy terms and payouts recorded on-chain
- **No Claims Process**: Smart contracts handle verification and payouts automatically
- **Real-time Monitoring**: Continuous flight status tracking via decentralized oracles

### Smart Contracts

- **PolicyManager**: Core contract managing insurance policies, tier configurations, and automated payouts
- **PYUSDMock**: Mock PayPal USD token for testing and development
- **MockFunctionsRouter**: Chainlink Functions router for oracle integration and testing

## Usage

### Development Setup

1. Install dependencies:
```shell
npm install
```

2. Start a local Hardhat node:
```shell
npm run node-localhost
```

3. Deploy contracts to local network:
```shell
npm run deploy-local
```

### Running Tests

To run all the tests in the project:

```shell
npx hardhat test
```

You can also run specific test files:

```shell
npx hardhat test test/PolicyManager.ts
npx hardhat test test/PYUSDMock.ts
```

### Deployment

#### Local Development

Deploy the complete policy stack (PolicyManager, PYUSDMock, MockFunctionsRouter) to localhost:

```shell
npm run deploy-local
```

#### Simulation Scripts

Simulate policy fulfillment and payouts:

```shell
npm run simulate-fulfill
```

This script simulates the complete insurance flow:
- Policy purchase
- Flight delay detection
- Automatic payout execution

#### Production Deployment

To deploy to Sepolia testnet:

1. Set up your private key using Hardhat keystore:
```shell
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
```

2. Deploy to Sepolia:
```shell
npx hardhat ignition deploy --network sepolia ignition/modules/PolicyStack.ts
```

### Network Configuration

The project supports multiple networks:

- **localhost**: Local development network (http://127.0.0.1:8545)
- **sepolia**: Ethereum Sepolia testnet
- **hardhatMainnet**: Simulated mainnet for testing
- **hardhatOp**: Simulated Optimism network for testing

## Smart Contract Details

### PolicyManager

The core contract that manages the entire insurance system:

- **Policy Management**: Create, track, and manage insurance policies
- **Tier System**: Four policy tiers (Basic, Silver, Gold, Platinum) with different coverage levels
- **Automated Payouts**: Triggered by Chainlink oracle responses for flight delays
- **Pricing Engine**: Dynamic premium calculation based on flight risk and tier selection
- **Multi-Currency Support**: Handles PYUSD token for premium payments and payouts

Key functions:
- `purchasePolicy()`: Create new insurance policies
- `fulfillRequest()`: Process oracle responses and execute payouts
- `claimPayout()`: Allow policyholders to claim their payouts
- `updateTierConfig()`: Admin function to modify tier configurations

### PYUSDMock

Mock implementation of PayPal USD token for testing:

- **ERC20 Compatible**: Standard token functionality
- **Minting**: Allows creation of test tokens for development
- **Transfer Controls**: Basic transfer and approval mechanisms

### MockFunctionsRouter

Mock Chainlink Functions router for oracle integration:

- **Request Simulation**: Simulates oracle requests for flight data
- **Response Handling**: Processes and forwards oracle responses
- **Testing Support**: Enables local testing of oracle-dependent functionality

## Dependencies

- **Hardhat 3.0**: Development framework with TypeScript support
- **OpenZeppelin**: Security-audited smart contract libraries
- **Chainlink**: Oracle integration for real-world data
- **Ethers.js**: Ethereum interaction library
- **Viem**: Modern Ethereum library for TypeScript
