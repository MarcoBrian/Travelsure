// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";

library PricingLib {
    function quote(uint256 payout, uint16 probBps, uint16 marginBps) internal pure returns (uint256) {
        uint256 base = (payout * probBps) / 10_000;
        return (base * (10_000 + marginBps)) / 10_000;
    }
}

contract PolicyManager is FunctionsClient, ConfirmedOwner, ReentrancyGuard {
    using SafeERC20 for IERC20;
    // FunctionsRequest helpers not used in mock setup

    // ---------------- Types ----------------
    enum FlightStatus { None, Active, Claimable, PaidOut, Expired }
    enum PolicyTier { Basic, Silver, Gold, Platinum }

    struct Policy {
        address holder;
        bytes32 flightHash;
        uint64  departureTime;
        uint64  expiry;
        uint64  thresholdMinutes;
        uint256 premium;
        uint256 payout;
        FlightStatus  status;
        PolicyTier tier;
    }

    struct TierConfig {
        uint256 basePayout;        // Base payout amount for this tier
        uint16 premiumMultiplierBps; // Premium multiplier in basis points (e.g., 10000 = 1x, 12000 = 1.2x)
        uint64 thresholdMinutes;   // Delay threshold for this tier
        uint16 probBps;            // Event probability in basis points for this tier
        uint16 marginBps;          // Pricing margin in basis points for this tier
        bool active;               // Whether this tier is available
    }

    struct PurchaseParams {
        bytes32 flightHash;
        uint64  departureTime;
    }

    // ---------------- Config ----------------
    IERC20 public immutable PYUSD;
    uint8 public immutable pyusdDecimals;

    // Chainlink Functions config, in mock set-up these will not be used
    uint64  public subscriptionId;
    uint32  public fulfillGasLimit = 300_000;
    bytes32 public donID;        // per-network DON id (see Chainlink docs: https://docs.chain.link/chainlink-functions/supported-networks)

    // Router is provided to FunctionsClient via constructor
    

    // ---------------- Storage ----------------
    uint256 public nextPolicyId;
    mapping(uint256 => Policy) public policies;
    mapping(address => uint256[]) private _ownedPolicies;
    uint64 public expiryWindow = uint64(48 hours);
    // key = keccak256(user, flightHash)    
    mapping(bytes32 => bool) public hasActivePolicy;

    // Map requestId => policyId so we know which policy to settle in fulfill
    mapping(bytes32 => uint256) public requestToPolicy;

    // Tier configurations
    mapping(PolicyTier => TierConfig) public tierConfigs;


    // ----Utils---
    function _key(address user, bytes32 flightHash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(user, flightHash));
    }

    function _releasePolicy(uint256 id) internal {
        Policy storage pol = policies[id];
        hasActivePolicy[_key(pol.holder, pol.flightHash)] = false;
    }

    function _initializeTierConfigs() internal {
        uint256 baseUnit = 10 ** uint256(pyusdDecimals);
        
        // Basic tier: $100 payout, 1x premium, 4 hours threshold, standard risk
        tierConfigs[PolicyTier.Basic] = TierConfig({
            basePayout: 100 * baseUnit,
            premiumMultiplierBps: 10000, // 1x
            thresholdMinutes: 240, // 4 hours
            probBps: 3000, // 30% base probability
            marginBps: 500, // 5% margin
            active: true
        });
        
        // Silver tier: $250 payout, 1.2x premium, 3 hours threshold, slightly higher risk
        tierConfigs[PolicyTier.Silver] = TierConfig({
            basePayout: 250 * baseUnit,
            premiumMultiplierBps: 12000, // 1.2x
            thresholdMinutes: 180, // 3 hours
            probBps: 3200, // 32% probability (higher risk)
            marginBps: 600, // 6% margin
            active: true
        });
        
        // Gold tier: $500 payout, 1.5x premium, 2 hours threshold, higher risk
        tierConfigs[PolicyTier.Gold] = TierConfig({
            basePayout: 500 * baseUnit,
            premiumMultiplierBps: 15000, // 1.5x
            thresholdMinutes: 120, // 2 hours
            probBps: 3500, // 35% probability (higher risk)
            marginBps: 700, // 7% margin
            active: true
        });
        
        // Platinum tier: $1000 payout, 1.5x premium, 1 hour threshold, highest risk
        tierConfigs[PolicyTier.Platinum] = TierConfig({
            basePayout: 1000 * baseUnit,
            premiumMultiplierBps: 15000, // 1.5x
            thresholdMinutes: 60, // 1 hour
            probBps: 4000, // 40% probability (highest risk)
            marginBps: 800, // 8% margin
            active: true
        });
    }
    


    constructor(address _router, address _pyusd)
        FunctionsClient(_router)
        ConfirmedOwner(msg.sender)
    {
        PYUSD = IERC20(_pyusd);
        pyusdDecimals = IERC20Metadata(_pyusd).decimals();
        subscriptionId = 0; // mock subscriptionId
        donID = bytes32(0); // mock donID

        // Initialize tier configurations
        _initializeTierConfigs();
    }

    // ---------------- Events ----------------
    event PolicyPurchased(uint256 indexed id, address indexed holder, bytes32 flightHash, uint256 premium, uint256 payout, PolicyTier tier);
    event OracleRequested(uint256 indexed policyId, bytes32 requestId);
    event OracleResult(uint256 indexed policyId, bool occurred, uint64 delayMinutes);
    event PolicyPaid(uint256 indexed id, address indexed to, uint256 amount);
    event PolicyExpired(uint256 indexed id);

    event ExpiryWindowUpdated(uint64 expiryWindow);
    event DonIDUpdated(bytes32 donID);
    event SubscriptionIDUpdated(uint64 subscriptionId);
    event TierConfigUpdated(PolicyTier indexed tier, uint256 basePayout, uint16 premiumMultiplierBps, uint64 thresholdMinutes, uint16 probBps, uint16 marginBps, bool active);

    // ---------------- Admin to set Chainlink Functions config----------------
    function setFunctionsConfig(uint64 _subId, uint32 _gasLimit, bytes32 _donID) external onlyOwner {
        subscriptionId = _subId;
        fulfillGasLimit = _gasLimit;
        donID = _donID;
    }

    // ---------------- Admin functions to set Insurance Parameters ----------------

    function setExpiryWindow(uint64 _expiryWindow) external onlyOwner {
        // Require at least 1 hour and at most 14 days to prevent misconfiguration
        require(_expiryWindow >= 1 hours && _expiryWindow <= 14 days, "expiryWindow out of range");
        expiryWindow = _expiryWindow;
        emit ExpiryWindowUpdated(_expiryWindow);
    }

    // ---- Chainlink Functions config ----
    function setSubscriptionId(uint64 _subscriptionId) external onlyOwner {
        subscriptionId = _subscriptionId;
        emit SubscriptionIDUpdated(_subscriptionId);
    }

    function setDonID(bytes32 _donID) external onlyOwner {
        donID = _donID;
        emit DonIDUpdated(_donID);
    }

    // ---------------- Tier Management Functions ----------------
    function setTierConfig(
        PolicyTier _tier,
        uint256 _basePayout,
        uint16 _premiumMultiplierBps,
        uint64 _thresholdMinutes,
        uint16 _probBps,
        uint16 _marginBps,
        bool _active
    ) external onlyOwner {
        require(_basePayout > 0, "Base payout must be > 0");
        require(_premiumMultiplierBps > 0 && _premiumMultiplierBps <= 50000, "Premium multiplier out of range"); // max 5x
        require(_thresholdMinutes >= 30 && _thresholdMinutes <= 1440, "Threshold out of range"); // max 24 hours
        require(_probBps > 0 && _probBps <= 10_000, "probBps out of range");
        require(_marginBps > 0 && _marginBps <= 10_000, "marginBps out of range");
        
        tierConfigs[_tier] = TierConfig({
            basePayout: _basePayout,
            premiumMultiplierBps: _premiumMultiplierBps,
            thresholdMinutes: _thresholdMinutes,
            probBps: _probBps,
            marginBps: _marginBps,
            active: _active
        });
        
        emit TierConfigUpdated(_tier, _basePayout, _premiumMultiplierBps, _thresholdMinutes, _probBps, _marginBps, _active);
    }

    function getTierConfig(PolicyTier _tier) external view returns (TierConfig memory) {
        return tierConfigs[_tier];
    }

    function getTierPricing(PolicyTier _tier) external view returns (uint256 premium, uint256 payout, uint64 threshold) {
        TierConfig memory config = tierConfigs[_tier];
        require(config.active, "Tier not active");
        
        uint256 basePremium = PricingLib.quote(config.basePayout, config.probBps, config.marginBps);
        premium = (basePremium * config.premiumMultiplierBps) / 10000;
        payout = config.basePayout;
        threshold = config.thresholdMinutes;
    }


    // ---------------- Buy ----------------
    function buyPolicy(PurchaseParams calldata p, PolicyTier tier) external nonReentrant returns (uint256 policyId) {
        bytes32 key = _key(msg.sender, p.flightHash);
        require(!hasActivePolicy[key], "User already insured for this flight");
        uint64 expiryTs = p.departureTime + expiryWindow;
        require(expiryTs > block.timestamp && expiryTs > p.departureTime, "Invalid times");
        
        // Get tier configuration
        TierConfig memory config = tierConfigs[tier];
        require(config.active, "Tier not active");

        // Calculate tier-specific pricing using tier's own risk parameters
        uint256 basePremium = PricingLib.quote(config.basePayout, config.probBps, config.marginBps);
        uint256 premium = (basePremium * config.premiumMultiplierBps) / 10000;
        
        PYUSD.safeTransferFrom(msg.sender, address(this), premium);

        policyId = ++nextPolicyId;
        policies[policyId] = Policy({
            holder: msg.sender,
            flightHash: p.flightHash,
            departureTime: p.departureTime,
            expiry: expiryTs,
            thresholdMinutes: config.thresholdMinutes,
            premium: premium,
            payout: config.basePayout,
            status: FlightStatus.Active,
            tier: tier
        });
        _ownedPolicies[msg.sender].push(policyId);
        hasActivePolicy[key] = true;

        emit PolicyPurchased(policyId, msg.sender, p.flightHash, premium, config.basePayout, tier);
    }

    // ---------------- Chainlink Functions: SEND ----------------
    /**
     * Initiate a Chainlink Functions run for a specific policy.
     * `args` example for demo: ["DEMO_TRUE","90","120"]
     */
    function requestVerification(uint256 policyId, string[] calldata /* args */)
        external
        returns (bytes32 requestId)
    {
        Policy storage p = policies[policyId];
        require(p.status == FlightStatus.Active, "Inactive");
        require(msg.sender == p.holder);
        require(block.timestamp >= p.departureTime, "Too early");
        require(block.timestamp <= p.expiry, "Expired window");

        // Send empty payload; mock router can ignore and respond deterministically
        bytes32 reqId = _sendRequest(
            bytes(""),
            subscriptionId,
            fulfillGasLimit,
            donID
        );

        requestToPolicy[reqId] = policyId;
        emit OracleRequested(policyId, reqId);
        return reqId;
    }

    // ---------------- Chainlink Functions: FULFILL ----------------
    /**
     * Router-only callback. Decodes (bool occurred, uint64 delayMinutes) and settles if eligible.
     */
    function fulfillRequest(bytes32 requestId, bytes memory response, bytes memory err) internal override {
        uint256 policyId = requestToPolicy[requestId];
        Policy storage p = policies[policyId];

        // If unknown request or policy already final, just ignore
        if (policyId == 0 || (p.status != FlightStatus.Active && p.status != FlightStatus.Claimable)) {
            return;
        }
        if (block.timestamp > p.expiry) {
            return; // ignore late fulfillments
        }

        bool occurred;
        uint64 delayMinutes;

        if (err.length == 0 && response.length > 0) {
            (occurred, delayMinutes) = abi.decode(response, (bool, uint64));
        } else {
            occurred = false;
            delayMinutes = 0;
        }

        emit OracleResult(policyId, occurred, delayMinutes);

        if (occurred && delayMinutes >= p.thresholdMinutes) {
            p.status = FlightStatus.Claimable;
            _payout(policyId);
        }
    }

    // ---------------- Payout / Expiry ----------------
    function _payout(uint256 policyId) internal {
        Policy storage p = policies[policyId];
        require(p.status == FlightStatus.Claimable, "Not claimable");
        p.status = FlightStatus.PaidOut;
        PYUSD.safeTransfer(p.holder, p.payout);
        _releasePolicy(policyId);
        emit PolicyPaid(policyId, p.holder, p.payout);
    }

    function expire(uint256 policyId) external {
        Policy storage p = policies[policyId];
        if (p.status == FlightStatus.Active && block.timestamp > p.expiry) {
            p.status = FlightStatus.Expired;
            _releasePolicy(policyId);
            emit PolicyExpired(policyId);
        }
    }

    // ---------------- UI helpers ----------------
    function policyCountOf(address user) external view returns (uint256) {
        return _ownedPolicies[user].length;
    }
    function policyIdOfOwnerByIndex(address user, uint256 i) external view returns (uint256) {
        return _ownedPolicies[user][i];
    }
}
