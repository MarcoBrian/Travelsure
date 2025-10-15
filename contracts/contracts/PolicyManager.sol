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

    struct Policy {
        address holder;
        bytes32 flightHash;
        uint64  departureTime;
        uint64  expiry;
        uint64  thresholdMinutes;
        uint256 premium;
        uint256 payout;
        FlightStatus  status;
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


    // ----Utils---
    function _key(address user, bytes32 flightHash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(user, flightHash));
    }

    function _releasePolicy(uint256 id) internal {
        Policy storage pol = policies[id];
        hasActivePolicy[_key(pol.holder, pol.flightHash)] = false;
    }
    

    // ---------------- Pricing (owner-controlled) ----------------
    uint16 public probBps;      // base event probability in basis points 30%
    uint16 public marginBps;    // pricing margin in basis points 5% 
    uint256 public payoutAmount; // fixed payout amount for all policies (can be adjusted by owner)
    uint64 public THRESHOLD_MINUTES = 240; // 4 hours

    constructor(address _router, address _pyusd)
        FunctionsClient(_router)
        ConfirmedOwner(msg.sender)
    {
        PYUSD = IERC20(_pyusd);
        pyusdDecimals = IERC20Metadata(_pyusd).decimals();
        subscriptionId = 0; // mock subscriptionId
        donID = bytes32(0); // mock donID
        // set a sane default payout amount: 500 units in token's smallest denomination
        payoutAmount = 500 * (10 ** uint256(pyusdDecimals));
        marginBps = 500;
        probBps = 3000;

    }

    // ---------------- Events ----------------
    event PolicyPurchased(uint256 indexed id, address indexed holder, bytes32 flightHash, uint256 premium, uint256 payout);
    event OracleRequested(uint256 indexed policyId, bytes32 requestId);
    event OracleResult(uint256 indexed policyId, bool occurred, uint64 delayMinutes);
    event PolicyPaid(uint256 indexed id, address indexed to, uint256 amount);
    event PolicyExpired(uint256 indexed id);

    event PricingUpdated(uint16 probBps, uint16 marginBps, uint256 payoutAmount);
    event ExpiryWindowUpdated(uint64 expiryWindow);
    event ThresholdMinutesUpdated(uint64 thresholdMinutes);
    event DonIDUpdated(bytes32 donID);
    event SubscriptionIDUpdated(uint64 subscriptionId);

    // ---------------- Admin to set Chainlink Functions config----------------
    function setFunctionsConfig(uint64 _subId, uint32 _gasLimit, bytes32 _donID) external onlyOwner {
        subscriptionId = _subId;
        fulfillGasLimit = _gasLimit;
        donID = _donID;
    }

    // ---------------- Admin functions to set Insurance Parameters ----------------

    function setPricing(uint16 _probBps, uint16 _marginBps, uint256 _payoutAmount) external onlyOwner {
        require(_probBps > 0 && _probBps <= 10_000, "probBps out of range");
        require(_marginBps > 0 && _marginBps <= 10_000, "marginBps out of range");
        require(_payoutAmount > 0, "payout must be > 0");
        probBps = _probBps;
        marginBps = _marginBps;
        payoutAmount = _payoutAmount;
        emit PricingUpdated(_probBps, _marginBps, _payoutAmount);
    }

    function setExpiryWindow(uint64 _expiryWindow) external onlyOwner {
        // Require at least 1 hour and at most 14 days to prevent misconfiguration
        require(_expiryWindow >= 1 hours && _expiryWindow <= 14 days, "expiryWindow out of range");
        expiryWindow = _expiryWindow;
        emit ExpiryWindowUpdated(_expiryWindow);
    }

    function setThresholdMinutes(uint64 _thresholdMinutes) external onlyOwner {
        require(_thresholdMinutes >= 30 && _thresholdMinutes <= 360, "thresholdMinutes out of range"); // max 6 hours
        THRESHOLD_MINUTES = _thresholdMinutes;
        emit ThresholdMinutesUpdated(_thresholdMinutes);
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


    // ---------------- Buy ----------------
    function buyPolicy(PurchaseParams calldata p) external nonReentrant returns (uint256 policyId) {
        bytes32 key = _key(msg.sender, p.flightHash);
        require(!hasActivePolicy[key], "User already insured for this flight");
        uint64 expiryTs = p.departureTime + expiryWindow;
        require(expiryTs > block.timestamp && expiryTs > p.departureTime, "Invalid times");
        require(payoutAmount > 0, "Pricing not set");
        require(probBps > 0, "Pricing not set");
        require(THRESHOLD_MINUTES > 0, "Threshold not set");
        require(marginBps > 0, "Margin not set");

    
        uint256 premium = PricingLib.quote(payoutAmount, probBps, marginBps);
        PYUSD.safeTransferFrom(msg.sender, address(this), premium);

        policyId = ++nextPolicyId;
        policies[policyId] = Policy({
            holder: msg.sender,
            flightHash: p.flightHash,
            departureTime: p.departureTime,
            expiry: expiryTs,
            thresholdMinutes: THRESHOLD_MINUTES,
            premium: premium,
            payout: payoutAmount,
            status: FlightStatus.Active
        });
        _ownedPolicies[msg.sender].push(policyId);
        hasActivePolicy[key] = true;

        emit PolicyPurchased(policyId, msg.sender, p.flightHash, premium, payoutAmount);
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
