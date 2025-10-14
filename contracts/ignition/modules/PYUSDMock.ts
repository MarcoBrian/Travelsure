import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const PYUSDMockModule = buildModule("PYUSDMockModule", (m) => {
  // Deploy PYUSDMock contract
  const pyusdMock = m.contract("PYUSDMock", [], {
    from: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" // Use account #1
  });
  return { pyusdMock };
});

export default PYUSDMockModule;
