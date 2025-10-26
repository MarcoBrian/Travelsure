import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Deploys the complete policy stack:
// - PYUSDMock (ERC20-like stablecoin)
// - MockFunctionsRouter (Chainlink Functions mock)
// - PolicyManager (wired with router + PYUSDMock)
const PolicyStack = buildModule("PolicyStack", (m) => {
  const pyusd = m.contract("PYUSDMock");
  const router = m.contract("MockFunctionsRouter");

  const policyManager = m.contract("PolicyManagerSepolia", [router, pyusd]);

  return { pyusd, router, policyManager };
});

export default PolicyStack;


