# Travelsure API Integration with Chainlink Functions

This implementation connects your PolicyManager smart contract with the Travelsure flight delay API using Chainlink Functions.

## Overview

The integration allows your smart contract to:

1. Query real flight delay data from `https://travelsure-production.up.railway.app/api/flights`
2. Automatically process insurance claims based on actual delay information
3. Support testing scenarios with simulated delays

## Files Created

### 1. `scripts/travelsure-oracle-source.js`

- Complete, readable JavaScript source code for Chainlink Functions
- Handles API calls, error checking, and data processing
- Returns encoded `(bool delayOccurred, uint64 delayMinutes)` for the smart contract

### 2. `scripts/chainlink-functions-source.js`

- Simplified version of the JavaScript source
- More compact for easier review

### 3. `scripts/test-travelsure-integration.js`

- Test script to validate the integration
- Includes deployment instructions and network configurations

### 4. Updated `PolicyManager.sol`

- Added `FunctionsRequest` library import
- Updated `requestVerification()` function to accept flight number and delay simulation flag
- Minified JavaScript source embedded in the contract

## Smart Contract Changes

### New Function Signature

```solidity
function requestVerification(uint256 policyId, string calldata flightNumber, bool simulateDelay)
    external
    returns (bytes32 requestId)
```

### Usage Example

```solidity
// Request verification for policy #1, flight AA123, with delay simulation
bytes32 requestId = policyManager.requestVerification(1, "AA123", true);
```

## Setup Instructions

### 1. Configure Chainlink Functions

1. **Create Subscription**

   - Visit [Chainlink Functions](https://functions.chain.link/)
   - Create a new subscription
   - Fund with LINK tokens (recommended: 2+ LINK)

2. **Add Consumer**

   - Add your deployed PolicyManager contract address as a consumer

3. **Configure Contract**
   ```solidity
   // Example for Ethereum Sepolia
   policyManager.setFunctionsConfig(
       123, // your subscription ID
       300000, // gas limit
       "fun-ethereum-sepolia-1" // DON ID
   );
   ```

### 2. Network Configurations

#### Ethereum Sepolia

- **Router**: `0xb83E47C2bC239B3bf370bc41e1459A34b41238D0`
- **DON ID**: `fun-ethereum-sepolia-1`
- **Chain ID**: 11155111

#### Polygon Mumbai

- **Router**: `0x6E2dc0F9DB014aE19888F539E59285D2Ea04244C`
- **DON ID**: `fun-polygon-mumbai-1`
- **Chain ID**: 80001

#### Base Sepolia

- **Router**: `0xf9B8fc078197181C841c296C876945aaa425B278`
- **DON ID**: `fun-base-sepolia-1`
- **Chain ID**: 84532

### 3. Testing the Integration

#### Basic Test Flow

1. **Deploy Contract** with proper router address
2. **Configure Functions** with subscription details
3. **Purchase Policy** using `buyPolicy()`
4. **Request Verification** with a flight number

#### Test Flight Numbers

The Travelsure API contains 250+ flights. Try these examples:

- `AA123` - American Airlines
- `UA456` - United Airlines
- `DL789` - Delta Air Lines
- `BA101` - British Airways

#### Delay Simulation

- Set `simulateDelay=true` to test delay scenarios
- Set `simulateDelay=false` for normal flight status
- Simulated delays range from 30-300 minutes

## API Integration Details

### Request Format

```
GET https://travelsure-production.up.railway.app/api/flights?flightNumber=AA123&simulateDelay=true
```

### Response Processing

The JavaScript code processes the API response and:

1. Checks if flight exists
2. Examines flight status for "delayed"
3. Extracts delay minutes from `delay_minutes` field
4. Falls back to calculating from departure times
5. Returns encoded boolean and uint64 for the contract

### Return Format

```solidity
// Contract receives:
(bool delayOccurred, uint64 delayMinutes) = abi.decode(response, (bool, uint64));
```

## Error Handling

The integration handles several error scenarios:

- **API Unavailable**: Throws error to retry later
- **Flight Not Found**: Returns `(false, 0)` - no delay
- **Invalid Response**: Throws error for investigation
- **Network Timeout**: 10-second timeout with retry capability

## Security Considerations

1. **API Reliability**: The Travelsure API is deployed on Railway with high uptime
2. **Data Validation**: Multiple validation layers in the JavaScript code
3. **Gas Optimization**: Minified source code to reduce transaction costs
4. **Rate Limiting**: Chainlink Functions handles request throttling

## Development Workflow

### Local Testing

```bash
# Test the API directly
npx hardhat run scripts/test-travelsure-integration.js

# Deploy and configure contract
npx hardhat run scripts/deploy.js --network sepolia
```

### Production Deployment

1. Deploy to mainnet/testnet
2. Configure with production Chainlink Functions subscription
3. Test with real flight data
4. Monitor oracle performance

## Troubleshooting

### Common Issues

**"Subscription not found"**

- Ensure subscription ID is correct
- Verify subscription has sufficient LINK balance

**"Consumer not authorized"**

- Add contract address to subscription consumers
- Wait for blockchain confirmation

**"Request timeout"**

- Increase gas limit (try 400,000)
- Check Travelsure API availability

**"No flight data"**

- Verify flight number format (e.g., "AA123")
- Try with `simulateDelay=true` for testing

### Monitoring

Monitor your integration through:

- Chainlink Functions dashboard
- Contract events (`OracleRequested`, `OracleResult`)
- Travelsure API logs
- Transaction gas usage

## Cost Estimation

- **LINK per request**: ~0.1 LINK (varies by network)
- **Gas per request**: ~200,000-300,000 gas
- **API calls**: Free (Railway hosted)

For a production system with 100 daily claims:

- Monthly LINK cost: ~3 LINK
- Gas costs: Variable by network
