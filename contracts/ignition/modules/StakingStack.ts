import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deploys the complete staking stack for Travelsure:
 * 1. Mock tokens (USDC, PYUSD)
 * 2. AaveV3Adapter (connects to real Aave on Sepolia)
 * 3. InsuranceSubsidyPool (accumulates yield spread)
 * 4. PackageManager (tiered staking packages)
 * 5. PolicyManager (existing insurance contracts)
 * 
 * Deploy to Sepolia: npx hardhat ignition deploy ignition/modules/StakingStack.ts --network sepolia
 */
const StakingStack = buildModule("StakingStack", (m) => {
  // ============ STEP 1: Deploy Tokens ============
  const usdc = m.contract("MockUSDC");
  const pyusd = m.contract("PYUSDMock");

  // ============ STEP 2: Deploy Aave Adapter ============
  // Aave V3 addresses on Sepolia
  const AAVE_POOL_SEPOLIA = "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951";
  const AUSDC_SEPOLIA = "0x16dA4541aD1807f4443d92D26044C1147406EB80"; // aUSDC on Sepolia
  
  const aaveAdapter = m.contract("AaveV3Adapter", [
    usdc,
    AUSDC_SEPOLIA,
    AAVE_POOL_SEPOLIA
  ]);

  // ============ STEP 3: Deploy Insurance Subsidy Pool ============
  const insurancePool = m.contract("InsuranceSubsidyPool", [
    usdc,
    pyusd
  ]);

  // ============ STEP 4: Deploy Package Manager ============
  const packageManager = m.contract("PackageManager", [usdc]);

  // ============ STEP 5: Deploy Policy Manager ============
  const mockRouter = m.contract("MockFunctionsRouter");
  const policyManager = m.contract("PolicyManager", [mockRouter, pyusd]);

  // ============ STEP 6: Wire Contracts Together ============
  
  // Set PackageManager address in AaveAdapter
  m.call(aaveAdapter, "setPackageManager", [packageManager], {
    id: "set_pm_in_aave"
  });

  // Set PackageManager address in InsurancePool
  m.call(insurancePool, "setPackageManager", [packageManager], {
    id: "set_pm_in_pool"
  });

  // Set PolicyManager address in InsurancePool
  m.call(insurancePool, "setPolicyManager", [policyManager], {
    id: "set_policy_in_pool"
  });

  // Set AaveAdapter in PackageManager
  m.call(packageManager, "setAaveAdapter", [aaveAdapter], {
    id: "set_aave_in_pm"
  });

  // Set InsurancePool in PackageManager
  m.call(packageManager, "setInsurancePool", [insurancePool], {
    id: "set_pool_in_pm"
  });

  // Set PolicyManager in PackageManager
  m.call(packageManager, "setPolicyManager", [policyManager], {
    id: "set_policy_in_pm"
  });

  // ============ STEP 7: Create Package Tiers ============
  
  // Bronze Package: $1,000 min, 3 months, 3.5% APY, 1 free policy
  m.call(packageManager, "createPackage", [
    "Bronze Package",
    1000e6,        // $1,000 USDC (6 decimals)
    90 * 24 * 60 * 60,  // 90 days in seconds
    350,           // 3.5% in basis points
    1              // 1 free policy
  ], {
    id: "create_bronze"
  });

  // Silver Package: $5,000 min, 6 months, 3.5% APY, 3 free policies
  m.call(packageManager, "createPackage", [
    "Silver Package",
    5000e6,        // $5,000 USDC
    180 * 24 * 60 * 60, // 180 days
    350,           // 3.5%
    3              // 3 free policies
  ], {
    id: "create_silver"
  });

  // Gold Package: $10,000 min, 12 months, 3.5% APY, 6 free policies
  m.call(packageManager, "createPackage", [
    "Gold Package",
    10000e6,       // $10,000 USDC
    365 * 24 * 60 * 60, // 365 days
    350,           // 3.5%
    6              // 6 free policies
  ], {
    id: "create_gold"
  });

  // ============ STEP 8: Initialize PolicyManager Pricing ============
  
  // Set pricing: 30% probability, 5% margin, 500 PYUSD payout
  m.call(policyManager, "setPricing", [
    3000,           // 30% probability in basis points
    500,            // 5% margin in basis points
    500e6           // 500 PYUSD payout (6 decimals)
  ], {
    id: "set_pricing"
  });

  // ============ STEP 9: Fund Insurance Pool with PYUSD for Testing ============
  
  // Mint 100,000 PYUSD to insurance pool for testnet
  m.call(insurancePool, "mintPYUSDForTestnet", [100000e6], {
    id: "fund_pool"
  });

  // ============ Return All Deployed Contracts ============
  return {
    // Tokens
    usdc,
    pyusd,
    
    // Core staking contracts
    aaveAdapter,
    insurancePool,
    packageManager,
    
    // Insurance contracts
    mockRouter,
    policyManager
  };
});

export default StakingStack;

