import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Deploys the policy stack WITHOUT staking for now
const PolicyStack = buildModule("PolicyStack", (m) => {
  const pyusd = m.contract("PYUSDMock");
  const router = m.contract("MockFunctionsRouter");
  const policyManager = m.contract("PolicyManager", [router, pyusd]);

  return { pyusd, router, policyManager };
});

export default PolicyStack;
