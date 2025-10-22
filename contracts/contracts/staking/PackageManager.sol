// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PackageManager
 * @notice Manages tiered staking packages with USDC, Aave yield, and free insurance
 * @dev Users stake USDC, earn 3.5% APY from Aave, get free flight insurance policies
 */
contract PackageManager is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Tokens
    IERC20 public immutable USDC;
    
    // Contracts
    address public aaveAdapter;
    address public insurancePool;
    address public policyManager;
    
    // Package structure
    struct Package {
        uint256 packageId;
        string name;              // "Bronze", "Silver", "Gold", etc.
        uint256 minStake;         // Minimum USDC required (6 decimals)
        uint256 lockDuration;     // Lock period in seconds
        uint256 yieldRateBps;     // User yield rate in basis points (350 = 3.5%)
        uint8 insuranceClaims;    // Number of free policies per lock period
        bool active;
    }
    
    // User stake structure
    struct UserStake {
        uint256 packageId;
        uint256 stakedAmount;     // USDC amount staked
        uint256 stakeTimestamp;   // When user staked
        uint256 unlockTime;       // When user can unstake
        uint8 claimsUsed;         // Number of insurance claims used
        uint8 claimsAllowed;      // Total claims allowed
        uint256 yieldClaimed;     // Total yield claimed so far
        bool isActive;
    }
    
    // Storage
    mapping(uint256 => Package) public packages;
    mapping(address => UserStake) public stakes;
    uint256 public packageCount;
    uint256 public totalStaked; // Total USDC staked across all users
    uint256 public totalYieldDistributed; // Total yield paid to users
    
    // Constants
    uint256 public constant PLATFORM_SPREAD_BPS = 49; // 0.49% to insurance pool
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant AAVE_DEPOSIT_PERCENTAGE = 80; // Deposit 80% to Aave
    
    // Events
    event PackageCreated(uint256 indexed packageId, string name, uint256 minStake, uint256 lockDuration);
    event Staked(address indexed user, uint256 packageId, uint256 amount, uint256 unlockTime);
    event YieldClaimed(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount, uint256 totalYield);
    event InsuranceRegistered(address indexed user, uint256 claimsRemaining);
    event AaveAdapterSet(address aaveAdapter);
    event InsurancePoolSet(address insurancePool);
    event PolicyManagerSet(address policyManager);

    /**
     * @notice Constructor
     * @param _usdc USDC token address
     */
    constructor(address _usdc) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC");
        USDC = IERC20(_usdc);
    }

    /**
     * @notice Set AaveAdapter address (only owner, one-time)
     */
    function setAaveAdapter(address _aaveAdapter) external onlyOwner {
        require(_aaveAdapter != address(0), "Invalid address");
        require(aaveAdapter == address(0), "Already set");
        aaveAdapter = _aaveAdapter;
        emit AaveAdapterSet(_aaveAdapter);
    }

    /**
     * @notice Set InsuranceSubsidyPool address (only owner, one-time)
     */
    function setInsurancePool(address _insurancePool) external onlyOwner {
        require(_insurancePool != address(0), "Invalid address");
        require(insurancePool == address(0), "Already set");
        insurancePool = _insurancePool;
        emit InsurancePoolSet(_insurancePool);
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
     * @notice Create a new package tier (only owner)
     * @param name Package name
     * @param minStake Minimum stake in USDC (6 decimals)
     * @param lockDuration Lock period in seconds
     * @param yieldRateBps Yield rate in basis points (350 = 3.5%)
     * @param insuranceClaims Number of free policies
     */
    function createPackage(
        string memory name,
        uint256 minStake,
        uint256 lockDuration,
        uint256 yieldRateBps,
        uint8 insuranceClaims
    ) external onlyOwner {
        require(minStake > 0, "Min stake must be > 0");
        require(lockDuration > 0, "Lock duration must be > 0");
        require(yieldRateBps <= 1000, "Yield rate too high"); // Max 10%
        
        uint256 packageId = packageCount++;
        
        packages[packageId] = Package({
            packageId: packageId,
            name: name,
            minStake: minStake,
            lockDuration: lockDuration,
            yieldRateBps: yieldRateBps,
            insuranceClaims: insuranceClaims,
            active: true
        });
        
        emit PackageCreated(packageId, name, minStake, lockDuration);
    }

    /**
     * @notice Buy a package and stake USDC
     * @param packageId ID of the package to buy
     * @param amount Amount of USDC to stake
     */
    function buyPackage(uint256 packageId, uint256 amount) external nonReentrant {
        Package memory pkg = packages[packageId];
        require(pkg.active, "Package not active");
        require(amount >= pkg.minStake, "Below minimum stake");
        require(!stakes[msg.sender].isActive, "Already staking");
        require(aaveAdapter != address(0), "Aave adapter not set");
        
        // Transfer USDC from user
        USDC.safeTransferFrom(msg.sender, address(this), amount);
        
        // Deposit 80% to Aave for yield
        uint256 aaveAmount = (amount * AAVE_DEPOSIT_PERCENTAGE) / 100;
        USDC.forceApprove(aaveAdapter, aaveAmount);
        
        // Call AaveAdapter to deposit
        (bool success, ) = aaveAdapter.call(
            abi.encodeWithSignature("depositToAave(uint256)", aaveAmount)
        );
        require(success, "Aave deposit failed");
        
        // Create user stake
        uint256 unlockTime = block.timestamp + pkg.lockDuration;
        stakes[msg.sender] = UserStake({
            packageId: packageId,
            stakedAmount: amount,
            stakeTimestamp: block.timestamp,
            unlockTime: unlockTime,
            claimsUsed: 0,
            claimsAllowed: pkg.insuranceClaims,
            yieldClaimed: 0,
            isActive: true
        });
        
        totalStaked += amount;
        
        emit Staked(msg.sender, packageId, amount, unlockTime);
    }

    /**
     * @notice Register a free insurance policy (for stakers only)
     * @dev Called when staker wants to use one of their free policies
     */
    function registerInsurance() external nonReentrant {
        UserStake storage userStake = stakes[msg.sender];
        require(userStake.isActive, "Not staking");
        require(userStake.claimsUsed < userStake.claimsAllowed, "No claims remaining");
        
        // Increment claims used
        userStake.claimsUsed++;
        
        uint8 remaining = userStake.claimsAllowed - userStake.claimsUsed;
        emit InsuranceRegistered(msg.sender, remaining);
        
        // Note: Actual policy creation happens in frontend/PolicyManager
        // This just tracks that user has used a claim
    }

    /**
     * @notice Claim accumulated yield (can be called anytime)
     * @dev Calculates yield based on time elapsed and Aave performance
     */
    function claimYield() external nonReentrant {
        UserStake storage userStake = stakes[msg.sender];
        require(userStake.isActive, "Not staking");
        
        uint256 yieldAmount = calculateUserYield(msg.sender);
        require(yieldAmount > 0, "No yield to claim");
        
        // Get yield from AaveAdapter
        (bool success, ) = aaveAdapter.call(
            abi.encodeWithSignature("withdrawFromAave(uint256,address)", yieldAmount, msg.sender)
        );
        require(success, "Yield withdrawal failed");
        
        // Update tracking
        userStake.yieldClaimed += yieldAmount;
        totalYieldDistributed += yieldAmount;
        
        emit YieldClaimed(msg.sender, yieldAmount);
    }

    /**
     * @notice Unstake and withdraw principal + remaining yield
     * @dev Can only unstake after lock period
     */
    function unstake() external nonReentrant {
        UserStake storage userStake = stakes[msg.sender];
        require(userStake.isActive, "Not staking");
        require(block.timestamp >= userStake.unlockTime, "Still locked");
        
        uint256 principal = userStake.stakedAmount;
        uint256 yieldAmount = calculateUserYield(msg.sender);
        
        // Withdraw principal + yield from Aave
        uint256 aaveAmount = (principal * AAVE_DEPOSIT_PERCENTAGE) / 100;
        uint256 totalWithdraw = aaveAmount + yieldAmount;
        
        (bool success, ) = aaveAdapter.call(
            abi.encodeWithSignature("withdrawFromAave(uint256,address)", totalWithdraw, address(this))
        );
        require(success, "Aave withdrawal failed");
        
        // Return full amount to user
        USDC.safeTransfer(msg.sender, principal + yieldAmount);
        
        // Update tracking
        totalStaked -= principal;
        totalYieldDistributed += yieldAmount;
        
        emit Unstaked(msg.sender, principal, userStake.yieldClaimed + yieldAmount);
        
        // Clear stake
        delete stakes[msg.sender];
    }

    /**
     * @notice Calculate user's current yield
     * @param user User address
     * @return Yield amount in USDC
     */
    function calculateUserYield(address user) public view returns (uint256) {
        UserStake memory userStake = stakes[user];
        if (!userStake.isActive) return 0;
        
        Package memory pkg = packages[userStake.packageId];
        
        // Time elapsed since stake
        uint256 timeElapsed = block.timestamp - userStake.stakeTimestamp;
        
        // Calculate yield: (amount * yieldRate * timeElapsed) / (365 days * 10000)
        uint256 aaveAmount = (userStake.stakedAmount * AAVE_DEPOSIT_PERCENTAGE) / 100;
        uint256 yield = (aaveAmount * pkg.yieldRateBps * timeElapsed) / (365 days * BPS_DENOMINATOR);
        
        // Subtract already claimed yield
        if (yield > userStake.yieldClaimed) {
            return yield - userStake.yieldClaimed;
        }
        return 0;
    }

    /**
     * @notice Get package info
     * @param packageId Package ID
     */
    function getPackageInfo(uint256 packageId) external view returns (Package memory) {
        return packages[packageId];
    }

    /**
     * @notice Get user stake info
     * @param user User address
     */
    function getUserStake(address user) external view returns (UserStake memory) {
        return stakes[user];
    }

    /**
     * @notice Check if user can register insurance
     * @param user User address
     * @return canRegister Whether user can register
     * @return claimsRemaining Number of claims remaining
     */
    function canRegisterInsurance(address user) external view returns (bool canRegister, uint8 claimsRemaining) {
        UserStake memory userStake = stakes[user];
        if (!userStake.isActive) return (false, 0);
        
        claimsRemaining = userStake.claimsAllowed - userStake.claimsUsed;
        canRegister = claimsRemaining > 0;
    }

    /**
     * @notice Get all active packages
     * @return Array of all package IDs
     */
    function getAllPackages() external view returns (uint256[] memory) {
        uint256[] memory activePackages = new uint256[](packageCount);
        uint256 count = 0;
        
        for (uint256 i = 0; i < packageCount; i++) {
            if (packages[i].active) {
                activePackages[count] = i;
                count++;
            }
        }
        
        // Resize array
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = activePackages[i];
        }
        
        return result;
    }
}

