// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// Aave V3 Pool interface (minimal, just what we need)
interface IPool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

/**
 * @title AaveV3Adapter
 * @notice Interfaces with Aave V3 protocol to generate yield on staked USDC
 * @dev Only PackageManager can deposit/withdraw. Uses real Aave V3 on Sepolia.
 */
contract AaveV3Adapter is Ownable {
    using SafeERC20 for IERC20;

    // Immutable addresses
    IERC20 public immutable USDC;
    IERC20 public immutable aUSDC; // Interest-bearing aToken
    IPool public immutable aavePool;
    
    address public packageManager; // Only this address can call deposit/withdraw
    
    // Tracking
    uint256 public totalDeposited; // Total USDC deposited to Aave
    
    // Events
    event DepositedToAave(uint256 amount, uint256 timestamp);
    event WithdrawnFromAave(uint256 amount, address recipient, uint256 timestamp);
    event PackageManagerSet(address packageManager);

    /**
     * @notice Constructor
     * @param _usdc USDC token address (MockUSDC on Sepolia)
     * @param _aUSDC aUSDC token address from Aave
     * @param _aavePool Aave V3 Pool address (0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951 on Sepolia)
     */
    constructor(
        address _usdc,
        address _aUSDC,
        address _aavePool
    ) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC");
        require(_aUSDC != address(0), "Invalid aUSDC");
        require(_aavePool != address(0), "Invalid Aave pool");
        
        USDC = IERC20(_usdc);
        aUSDC = IERC20(_aUSDC);
        aavePool = IPool(_aavePool);
    }

    /**
     * @notice Set the PackageManager address (only owner, one-time)
     */
    function setPackageManager(address _packageManager) external onlyOwner {
        require(_packageManager != address(0), "Invalid address");
        require(packageManager == address(0), "Already set");
        packageManager = _packageManager;
        emit PackageManagerSet(_packageManager);
    }

    /**
     * @notice Deposit USDC to Aave V3
     * @param amount Amount of USDC to deposit
     */
    function depositToAave(uint256 amount) external onlyPackageManager {
        require(amount > 0, "Amount must be > 0");
        
        // Transfer USDC from PackageManager
        USDC.safeTransferFrom(msg.sender, address(this), amount);
        
        // Approve Aave pool
        USDC.forceApprove(address(aavePool), amount);
        
        // Supply to Aave (receive aUSDC 1:1)
        aavePool.supply(address(USDC), amount, address(this), 0);
        
        // Track total deposited
        totalDeposited += amount;
        
        emit DepositedToAave(amount, block.timestamp);
    }

    /**
     * @notice Withdraw USDC from Aave V3
     * @param amount Amount of USDC to withdraw
     * @param recipient Address to receive USDC
     */
    function withdrawFromAave(uint256 amount, address recipient) external onlyPackageManager {
        require(amount > 0, "Amount must be > 0");
        require(recipient != address(0), "Invalid recipient");
        
        // Withdraw from Aave (burns aUSDC, returns USDC)
        uint256 withdrawn = aavePool.withdraw(address(USDC), amount, recipient);
        
        emit WithdrawnFromAave(withdrawn, recipient, block.timestamp);
    }

    /**
     * @notice Calculate total yield earned
     * @return Total yield = aUSDC balance - total deposited
     */
    function getYieldEarned() public view returns (uint256) {
        uint256 currentBalance = aUSDC.balanceOf(address(this));
        if (currentBalance > totalDeposited) {
            return currentBalance - totalDeposited;
        }
        return 0;
    }

    /**
     * @notice Get current aUSDC balance (includes principal + yield)
     */
    function getTotalBalance() external view returns (uint256) {
        return aUSDC.balanceOf(address(this));
    }

    /**
     * @notice Emergency withdraw all funds (owner only)
     * @dev Only use if PackageManager is compromised
     */
    function emergencyWithdraw(address recipient) external onlyOwner {
        uint256 balance = aUSDC.balanceOf(address(this));
        if (balance > 0) {
            aavePool.withdraw(address(USDC), type(uint256).max, recipient);
        }
    }

    // Modifier
    modifier onlyPackageManager() {
        require(msg.sender == packageManager, "Only PackageManager");
        _;
    }
}

