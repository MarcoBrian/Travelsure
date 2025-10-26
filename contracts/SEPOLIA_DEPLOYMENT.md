# Sepolia Testnet Deployment Guide

This guide walks you through deploying and testing PolicyManagerSepolia on Sepolia testnet with real Chainlink Functions.

## Prerequisites

1. **Sepolia ETH**: Get testnet ETH from [Sepolia Faucet](https://sepoliafaucet.com/)
2. **Chainlink Functions Subscription**: Create one at [Chainlink Functions](https://functions.chain.link/sepolia)
3. **LINK Tokens**: Add LINK to your subscription for function calls
4. **RPC URL**: Get from [Infura](https://infura.io/) or [Alchemy](https://alchemy.com/)

## Setup Steps

### 1. Environment Configuration

Copy the example environment file and fill in your values:

```bash
cp env.example .env
```

Edit `.env` with your actual values:

```bash
# Required: Your Sepolia RPC URL
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID

# Required: Your wallet private key (keep secure!)
SEPOLIA_PRIVATE_KEY=0x1234567890abcdef...

# Required: Your Chainlink Functions subscription ID
CHAINLINK_SUBSCRIPTION_ID=123

# Optional: Contract addresses (set after deployment)
POLICY_MANAGER_ADDRESS=0x...
PYUSD_ADDRESS=0x...
```

### 2. Deploy Contracts

Deploy PolicyManagerSepolia and PYUSDMock to Sepolia:

```bash
npm run deploy-sepolia
```

This will:
- Deploy PYUSDMock (test token)
- Deploy PolicyManagerSepolia with real Chainlink router
- Set JavaScript source code
- Configure Chainlink Functions parameters
- Mint test PYUSD tokens

**Save the contract addresses** from the output - you'll need them for the next steps.

### 3. Add Contract as Consumer

Add your deployed contract as an authorized consumer to your Chainlink subscription:

```bash
npm run add-consumer
```

This connects to the Chainlink Functions Coordinator and authorizes your contract to make requests.

### 4. Test End-to-End

Run a complete test with real Chainlink Functions:

```bash
npm run test-sepolia
```

This will:
- Buy a test policy
- Request verification (triggers real Chainlink request)
- Wait for fulfillment
- Verify payout

⚠️ **Warning**: This uses real LINK tokens from your subscription!

## Monitoring

- **Subscription**: Monitor at [Chainlink Functions Dashboard](https://functions.chain.link/sepolia/subscriptions/YOUR_SUBSCRIPTION_ID)
- **Transactions**: View on [Sepolia Etherscan](https://sepolia.etherscan.io/)
- **Contract**: Verify on Etherscan (optional)

## Troubleshooting

### Common Issues

1. **"Insufficient ETH balance"**
   - Get more Sepolia ETH from faucets

2. **"Missing environment variables"**
   - Check your `.env` file has all required values

3. **"Not authorized consumer"**
   - Run `npm run add-consumer` first

4. **"Fulfillment timeout"**
   - Check LINK balance in subscription
   - Verify API endpoint is accessible
   - Check network congestion

5. **"JS source not set"**
   - Redeploy contracts or call `setJsSource()` manually

### Manual Contract Interaction

If you need to interact with contracts manually:

```bash
# Connect to Sepolia
npx hardhat console --network sepolia

# In console:
const manager = await ethers.getContractAt("PolicyManagerSepolia", "YOUR_ADDRESS");
const jsSource = await manager.jsSource();
console.log("JS Source length:", jsSource.length);
```

## Cost Estimation

- **Deployment**: ~0.01 ETH
- **Each Chainlink request**: ~0.1 LINK
- **Policy purchase**: ~0.001 ETH
- **Verification request**: ~0.001 ETH

## Next Steps

Once testing is complete:

1. **Production Deployment**: Deploy to mainnet with real PYUSD
2. **Frontend Integration**: Connect your frontend to the deployed contract
3. **Monitoring**: Set up alerts for contract events
4. **Scaling**: Optimize gas usage and add more flight data sources
