// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// Aave V3 interfaces
interface IPool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
    function getReserveData(address asset) external view returns (uint256, uint128, uint128, uint128, uint128, uint128, uint40, uint16, address, address, address, uint256, uint128, uint128, uint128);
}

interface IAToken {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
}

// Tier NFT interface
interface ITierNFT {
    function mint(address to, uint256 tier) external returns (uint256);
    function burn(uint256 tokenId) external;
    function getTier(address user) external view returns (uint256);
}

contract TravelsureStaking is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ============ STRUCTS ============
    struct StakingPosition {
        uint256 amount;           // Amount staked
        uint256 timestamp;        // When staking started
        uint256 tier;            // Current tier (0=Basic, 1=Silver, 2=Gold, 3=Platinum)
        uint256 totalYield;      // Total yield earned
        bool active;             // Whether position is active
    }

    struct TierConfig {
        uint256 minAmount;       // Minimum amount for tier
        uint256 freeInsurance;   // Free insurance amount
        string name;             // Tier name
        bool active;             // Whether tier is active
    }

    // ============ STATE VARIABLES ============
    IERC20 public immutable PYUSD;
    IPool public immutable aavePool;
    IAToken public immutable aPYUSD;
    ITierNFT public immutable tierNFT;
    
    // Staking tracking
    mapping(address => StakingPosition) public stakingPositions;
    mapping(address => bool) public hasStaked;
    
    // Tier configurations
    mapping(uint256 => TierConfig) public tierConfigs;
    uint256 public totalStaked;
    uint256 public totalYieldDistributed;
    
    // Yield distribution (9% to user, 1% to platform)
    uint256 public constant USER_YIELD_BPS = 9000; // 90% of Aave yield
    uint256 public constant PLATFORM_FEE_BPS = 1000; // 10% of Aave yield
    
    // Tier thresholds
    uint256 public constant BASIC_TIER_THRESHOLD = 100 * 1e6; // $100 PYUSD
    uint256 public constant SILVER_TIER_THRESHOLD = 500 * 1e6; // $500 PYUSD
    uint256 public constant GOLD_TIER_THRESHOLD = 1000 * 1e6; // $1000 PYUSD
    uint256 public constant PLATINUM_TIER_THRESHOLD = 2000 * 1e6; // $2000 PYUSD
    
    // ============ EVENTS ============
    event Staked(address indexed user, uint256 amount, uint256 tier);
    event Unstaked(address indexed user, uint256 amount, uint256 yield);
    event YieldClaimed(address indexed user, uint256 yield);
    event TierUpgraded(address indexed user, uint256 oldTier, uint256 newTier);
    event FreeInsuranceGranted(address indexed user, uint256 amount);

    // ============ CONSTRUCTOR ============
    constructor(
        address _pyusd,
        address _aavePool,
        address _aPYUSD,
        address _tierNFT
    ) Ownable(msg.sender) {
        PYUSD = IERC20(_pyusd);
        aavePool = IPool(_aavePool);
        aPYUSD = IAToken(_aPYUSD);
        tierNFT = ITierNFT(_tierNFT);
        
        _initializeTierConfigs();
    }

    // ============ TIER MANAGEMENT ============
    function _initializeTierConfigs() internal {
        // Basic tier (>$100, no NFT minted)
        tierConfigs[0] = TierConfig({
            minAmount: 100 * 1e6, // $100
            freeInsurance: 0,
            name: "Basic",
            active: true
        });
        
        // Silver tier (>$500, NFT minted, FREE insurance)
        tierConfigs[1] = TierConfig({
            minAmount: 500 * 1e6, // $500
            freeInsurance: 0, // Free insurance via NFT
            name: "Silver",
            active: true
        });
        
        // Gold tier (>$1000, NFT minted, FREE insurance)
        tierConfigs[2] = TierConfig({
            minAmount: 1000 * 1e6, // $1000
            freeInsurance: 0, // Free insurance via NFT
            name: "Gold",
            active: true
        });
        
        // Platinum tier (>$2000, NFT minted, FREE insurance)
        tierConfigs[3] = TierConfig({
            minAmount: 2000 * 1e6, // $2000
            freeInsurance: 0, // Free insurance via NFT
            name: "Platinum",
            active: true
        });
    }

    // ============ STAKING FUNCTIONS ============
    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(PYUSD.balanceOf(msg.sender) >= amount, "Insufficient PYUSD balance");
        
        // Transfer PYUSD from user to this contract
        PYUSD.safeTransferFrom(msg.sender, address(this), amount);
        
        // Simplified: Just track in contract, no Aave interaction for MVP
        // In production, you'd interact with Aave here
        
        // Update staking position
        StakingPosition storage position = stakingPositions[msg.sender];
        if (position.active) {
            // Add to existing position
            position.amount += amount;
        } else {
            // Create new position
            position.amount = amount;
            position.timestamp = block.timestamp;
            position.active = true;
            hasStaked[msg.sender] = true;
        }
        
        // Update tier
        uint256 newTier = _calculateTier(position.amount);
        uint256 oldTier = position.tier;
        position.tier = newTier;
        
        totalStaked += amount;
        
        emit Staked(msg.sender, amount, newTier);
        
        // Only mint NFT for Silver+ tiers (tier >= 1)
        if (newTier > oldTier && newTier >= 1) {
            emit TierUpgraded(msg.sender, oldTier, newTier);
            
            // Mint/upgrade tier NFT
            tierNFT.mint(msg.sender, newTier);
        }
    }

    function unstake(uint256 amount) external nonReentrant {
        StakingPosition storage position = stakingPositions[msg.sender];
        require(position.active, "No active staking position");
        require(amount <= position.amount, "Amount exceeds staked amount");
        
        // Simplified: No yield calculation for MVP
        // In production, calculate and transfer yield
        
        // Update position
        position.amount -= amount;
        
        if (position.amount == 0) {
            position.active = false;
        } else {
            // Recalculate tier
            uint256 newTier = _calculateTier(position.amount);
            position.tier = newTier;
        }
        
        totalStaked -= amount;
        
        // Transfer PYUSD back to user
        PYUSD.safeTransfer(msg.sender, amount);
        
        emit Unstaked(msg.sender, amount, 0);
    }

    function claimYield() external nonReentrant {
        StakingPosition storage position = stakingPositions[msg.sender];
        require(position.active, "No active staking position");
        
        // Simplified: No yield for MVP
        // In production, calculate and transfer yield
        revert("Yield claiming not implemented in MVP");
    }

    // ============ VIEW FUNCTIONS ============
    function getStakingInfo(address user) external view returns (
        uint256 amount,
        uint256 tier,
        uint256 pendingYield,
        uint256 totalYield,
        bool active
    ) {
        StakingPosition memory position = stakingPositions[user];
        return (
            position.amount,
            position.tier,
            _calculateYield(user),
            position.totalYield,
            position.active
        );
    }

    function getTierInfo(uint256 tier) external view returns (
        uint256 minAmount,
        uint256 freeInsurance,
        string memory name,
        bool active
    ) {
        TierConfig memory config = tierConfigs[tier];
        return (
            config.minAmount,
            config.freeInsurance,
            config.name,
            config.active
        );
    }

    function calculateAPY() external view returns (uint256) {
        // Get Aave supply rate for PYUSD
        (, uint256 liquidityRate, , , , , , , , , , , , , ) = aavePool.getReserveData(address(PYUSD));
        return liquidityRate; // This is the base rate from Aave
    }

    // ============ INTERNAL FUNCTIONS ============
    function _calculateTier(uint256 amount) internal view returns (uint256) {
        if (amount >= tierConfigs[3].minAmount) return 3; // Platinum
        if (amount >= tierConfigs[2].minAmount) return 2; // Gold
        if (amount >= tierConfigs[1].minAmount) return 1; // Silver
        return 0; // Basic
    }

    function _calculateYield(address user) internal view returns (uint256) {
        StakingPosition memory position = stakingPositions[user];
        if (!position.active || position.amount == 0) return 0;
        
        // Calculate time-based yield from Aave
        uint256 timeElapsed = block.timestamp - position.timestamp;
        if (timeElapsed == 0) return 0;
        
        // Get current Aave rate
        (, uint256 liquidityRate, , , , , , , , , , , , , ) = aavePool.getReserveData(address(PYUSD));
        
        // Calculate yield: amount * rate * time / (365 days * 1e18)
        uint256 yield = (position.amount * liquidityRate * timeElapsed) / (365 days * 1e18);
        
        return yield;
    }

    function _grantFreeInsurance(address user, uint256 tier) internal {
        uint256 freeAmount = tierConfigs[tier].freeInsurance;
        if (freeAmount > 0) {
            // In a real implementation, this would integrate with PolicyManager
            // For now, we just emit an event
            emit FreeInsuranceGranted(user, freeAmount);
        }
    }

    // ============ ADMIN FUNCTIONS ============
    function updateTierConfig(
        uint256 tier,
        uint256 minAmount,
        uint256 freeInsurance,
        string calldata name,
        bool active
    ) external onlyOwner {
        tierConfigs[tier] = TierConfig({
            minAmount: minAmount,
            freeInsurance: freeInsurance,
            name: name,
            active: active
        });
    }

    function emergencyWithdraw() external onlyOwner {
        // Emergency function to withdraw all PYUSD from Aave
        uint256 balance = aPYUSD.balanceOf(address(this));
        if (balance > 0) {
            aavePool.withdraw(address(PYUSD), balance, owner());
        }
    }
}
