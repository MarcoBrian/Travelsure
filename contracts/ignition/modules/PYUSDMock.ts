import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const PYUSDMockModule = buildModule("PYUSDMockModule", (m) => {
  // Deploy PYUSDMock contract
  const pyusdMock = m.contract("PYUSDMock");
  return { pyusdMock };
});

export default PYUSDMockModule;
