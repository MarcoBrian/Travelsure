# Rainbow Kit Test Setup

This guide will help you test Rainbow Kit integration with the PYUSDMock contract.

## Prerequisites

1. Make sure you have a local Hardhat node running
2. Ensure you have the required environment variables set up

## Deployment Steps

### 1. Start Local Hardhat Node
```bash
cd contracts
npx hardhat node
```

### 2. Deploy the Contract
In a new terminal:
```bash
cd contracts
npx hardhat ignition deploy ignition/modules/PYUSDMock.ts --network hardhat
```

### 3. Update Contract Address
After deployment, copy the deployed contract address and update it in:
`frontend/lib/contracts.ts`

Replace the `PYUSDMockAddress` with your deployed address.

### 4. Start the Frontend
```bash
cd frontend
npm run dev
```

### 5. Test the Integration
1. Navigate to `http://localhost:3000/test_pyusdmock`
2. Connect your wallet using Rainbow Kit
3. Try the following interactions:
   - Mint some tokens
   - Check your balance
   - Transfer tokens to another address
   - Burn some tokens

## Test Page Features

The test page (`/test_pyusdmock`) includes:

- **Wallet Connection**: Connect using Rainbow Kit
- **Contract Info**: Display contract name, symbol, and decimals
- **Balance Display**: Show your current token balance
- **Mint Tokens**: Mint new tokens to your address
- **Burn Tokens**: Burn tokens from your address
- **Transfer Tokens**: Transfer tokens to another address
- **Transaction Status**: Display transaction hashes and status

## Troubleshooting

1. **Contract not found**: Make sure you've deployed the contract and updated the address
2. **Transaction fails**: Check that you have enough ETH for gas fees
3. **Wallet not connecting**: Ensure you have a wallet extension installed (MetaMask, etc.)

## Network Configuration

The test is configured for:
- **Local Hardhat Network**: `http://127.0.0.1:8545`
- **Chain ID**: 31337

Make sure your wallet is connected to the correct network.
