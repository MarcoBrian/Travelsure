## Travelsure — Run Locally

Follow these steps to run the full stack locally: Hardhat node + contract deployment + frontend.

### Prerequisites
- Node.js 18+ (recommended 20+)
- npm (or your preferred package manager)

### 1) Start a local Hardhat node
Open a terminal and run the node inside the `contracts` workspace. Keep this terminal running.

```bash
cd contracts
npx hardhat node

```

By default this starts an RPC server on `http://127.0.0.1:8545` with chainId `31337`.

### 2) Deploy contracts to localhost
In a second terminal, deploy using Hardhat Ignition while the node is running.

```bash
cd contracts
npx hardhat ignition deploy ./ignition/modules/PolicyStack.ts --network localhost
```

This deploys:
- `PYUSDMock`
- `MockFunctionsRouter`
- `PolicyManager` (wired to the router and PYUSDMock)

Deployment artifacts/addresses will be written under `contracts/ignition/deployments/` (e.g., `localhost-*`).

### 3) Start the frontend
In a third terminal:

```bash
cd frontend
npm install - if not installed yet
npm run dev
```

The app will start on `http://localhost:3000`.

### Notes
- Ensure the Hardhat node remains running while deploying and using the app.
- If you need to redeploy fresh, stop the node, restart it, and re-run the deploy step.

