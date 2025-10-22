// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title InsuranceSubsidyPool
 * @notice Accumulates 0.49% yield spread to fund free insurance policies for stakers
 * @dev Receives USDC from yield, converts to PYUSD, and buys policies via PolicyManager
 */
contract InsuranceSubsidyPool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Tokens
    IERC20 public immutable USDC;
    IERC20 public immutable PYUSD;
    
    // Contracts
    address public packageManager;
    address public policyManager;
    
    // Pool balance tracking
    uint256 public usdcBalance;
    uint256 public pyusdBalance;
    uint256 public totalPoliciesFunded;
    
    // Minimum balance to fund policies
    uint256 public constant MIN_POOL_BALANCE = 100e6; // 100 PYUSD
    
    // Events
    event YieldSubsidyReceived(uint256 usdcAmount, uint256 timestamp);
    event PolicyFunded(address indexed staker, bytes32 flightHash, uint256 premium, uint256 timestamp);
    event PYUSDMinted(uint256 amount); // For testnet
    event PackageManagerSet(address packageManager);
    event PolicyManagerSet(address policyManager);
    event EmergencyWithdraw(address recipient, uint256 usdcAmount, uint256 pyusdAmount);

    /**
     * @notice Constructor
     * @param _usdc USDC token address
     * @param _pyusd PYUSD token address
     */
    constructor(
        address _usdc,
        address _pyusd
    ) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC");
        require(_pyusd != address(0), "Invalid PYUSD");
        
        USDC = IERC20(_usdc);
        PYUSD = IERC20(_pyusd);
    }

    /**
     * @notice Set PackageManager address (only owner, one-time)
     */
    function setPackageManager(address _packageManager) external onlyOwner {
        require(_packageManager != address(0), "Invalid address");
        require(packageManager == address(0), "Already set");
        packageManager = _packageManager;
        emit PackageManagerSet(_packageManager);
    }

    /**
     * @notice Set PolicyManager address (only owner, one-time)
     */
    function setPolicyManager(address _policyManager) external onlyOwner {
        require(_policyManager != address(0), "Invalid address");
        require(policyManager == address(0), "Already set");
        policyManager = _policyManager;
        emit PolicyManagerSet(_policyManager);
    }

    /**
     * @notice Receive yield subsidy from PackageManager (0.49% spread)
     * @param amount Amount of USDC to receive
     */
    function receiveYieldSubsidy(uint256 amount) external onlyPackageManager nonReentrant {
        require(amount > 0, "Amount must be > 0");
        
        // Transfer USDC from PackageManager
        USDC.safeTransferFrom(msg.sender, address(this), amount);
        usdcBalance += amount;
        
        emit YieldSubsidyReceived(amount, block.timestamp);
    }

    /**
     * @notice Fund a policy for a staker (called by PackageManager)
     * @param staker Address of the staker
     * @param premium Amount of PYUSD needed for premium
     * @dev For testnet: We'll mint PYUSD directly since no Uniswap pools
     *      For mainnet: Would convert USDC → PYUSD via Uniswap
     */
    function fundStakerPolicy(
        address staker,
        uint256 premium
    ) external onlyPackageManager nonReentrant returns (bool) {
        require(staker != address(0), "Invalid staker");
        require(premium > 0, "Premium must be > 0");
        
        // Check if we have enough PYUSD
        uint256 currentPYUSD = PYUSD.balanceOf(address(this));
        
        if (currentPYUSD < premium) {
            // For testnet: Mint PYUSD (requires mock contract with public mint)
            // For mainnet: Would swap USDC → PYUSD here
            return false; // Cannot fund
        }
        
        // Approve PolicyManager to spend PYUSD
        PYUSD.forceApprove(policyManager, premium);
        
        // Track
        pyusdBalance -= premium;
        totalPoliciesFunded++;
        
        emit PolicyFunded(staker, bytes32(0), premium, block.timestamp);
        
        return true;
    }

    /**
     * @notice Check if pool can fund a policy with given premium
     * @param premium Required premium in PYUSD
     */
    function canFundPolicy(uint256 premium) external view returns (bool) {
        return PYUSD.balanceOf(address(this)) >= premium;
    }

    /**
     * @notice Get current pool balance
     * @return usdcBal USDC balance
     * @return pyusdBal PYUSD balance
     */
    function getPoolBalance() external view returns (uint256 usdcBal, uint256 pyusdBal) {
        usdcBal = USDC.balanceOf(address(this));
        pyusdBal = PYUSD.balanceOf(address(this));
    }

    /**
     * @notice Mint PYUSD for testnet (requires mock token)
     * @param amount Amount to mint
     * @dev Only works if PYUSD is a mock contract with public mint function
     */
    function mintPYUSDForTestnet(uint256 amount) external onlyOwner {
        // Call mint on mock PYUSD
        (bool success, ) = address(PYUSD).call(
            abi.encodeWithSignature("mint(address,uint256)", address(this), amount)
        );
        require(success, "Mint failed");
        pyusdBalance += amount;
        emit PYUSDMinted(amount);
    }

    /**
     * @notice Swap USDC to PYUSD via Uniswap (for mainnet)
     * @param usdcAmount Amount of USDC to swap
     * @dev Placeholder for mainnet implementation
     */
    function swapUSDCtoPYUSD(uint256 usdcAmount) external onlyOwner {
        require(usdcAmount > 0, "Amount must be > 0");
        require(usdcBalance >= usdcAmount, "Insufficient USDC");
        
        // TODO: Implement Uniswap V3 swap for mainnet
        // For now, just track the swap intent
        // In production, this would:
        // 1. Approve Uniswap router
        // 2. Execute exactInputSingle swap
        // 3. Update balances
        
        revert("Swap not implemented - use mintPYUSDForTestnet for Sepolia");
    }

    /**
     * @notice Emergency withdraw all funds (owner only)
     */
    function emergencyWithdraw(address recipient) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        
        uint256 usdcBal = USDC.balanceOf(address(this));
        uint256 pyusdBal = PYUSD.balanceOf(address(this));
        
        if (usdcBal > 0) {
            USDC.safeTransfer(recipient, usdcBal);
        }
        if (pyusdBal > 0) {
            PYUSD.safeTransfer(recipient, pyusdBal);
        }
        
        emit EmergencyWithdraw(recipient, usdcBal, pyusdBal);
    }

    // Modifiers
    modifier onlyPackageManager() {
        require(msg.sender == packageManager, "Only PackageManager");
        _;
    }
}

