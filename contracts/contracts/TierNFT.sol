// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Soulbound Tier NFT for Travelsure staking tiers
contract TierNFT is ERC721, Ownable, ReentrancyGuard {
    
    // Tier levels
    uint256 public constant BASIC_TIER = 0;
    uint256 public constant SILVER_TIER = 1;
    uint256 public constant GOLD_TIER = 2;
    uint256 public constant PLATINUM_TIER = 3;
    
    // Only staking contract can mint/burn
    address public stakingContract;
    
    // Track user's current tier
    mapping(address => uint256) public userTiers;
    mapping(uint256 => uint256) public tokenTiers; // tokenId => tier
    mapping(address => uint256) public userTokens; // user => tokenId
    
    uint256 private _nextTokenId = 1;
    
    // Events
    event TierMinted(address indexed user, uint256 tokenId, uint256 tier);
    event TierBurned(address indexed user, uint256 tokenId, uint256 tier);
    event TierUpgraded(address indexed user, uint256 oldTier, uint256 newTier);
    
    constructor(string memory name, string memory symbol) ERC721(name, symbol) Ownable(msg.sender) {}
    
    // Only staking contract can mint
    modifier onlyStaking() {
        require(msg.sender == stakingContract, "Only staking contract");
        _;
    }
    
    // Set staking contract address
    function setStakingContract(address _stakingContract) external onlyOwner {
        stakingContract = _stakingContract;
    }
    
    // Mint tier NFT to user
    function mint(address to, uint256 tier) external onlyStaking nonReentrant returns (uint256) {
        require(to != address(0), "Invalid address");
        require(tier <= PLATINUM_TIER, "Invalid tier");
        
        // If user already has a token, burn it first
        if (userTokens[to] != 0) {
            _burn(userTokens[to]);
        }
        
        uint256 tokenId = _nextTokenId++;
        _mint(to, tokenId);
        
        // Set tier data
        tokenTiers[tokenId] = tier;
        userTiers[to] = tier;
        userTokens[to] = tokenId;
        
        emit TierMinted(to, tokenId, tier);
        return tokenId;
    }
    
    // Burn tier NFT
    function burn(uint256 tokenId) external onlyStaking nonReentrant {
        address owner = ownerOf(tokenId);
        uint256 tier = tokenTiers[tokenId];
        
        _burn(tokenId);
        
        // Clear user data
        userTiers[owner] = 0;
        userTokens[owner] = 0;
        delete tokenTiers[tokenId];
        
        emit TierBurned(owner, tokenId, tier);
    }
    
    // Get user's current tier
    function getTier(address user) external view returns (uint256) {
        return userTiers[user];
    }
    
    // Get tier for specific token
    function getTierId(uint256 tokenId) external view returns (uint256) {
        return tokenTiers[tokenId];
    }
    
    // Check if user has specific tier or higher
    function hasTierOrHigher(address user, uint256 requiredTier) external view returns (bool) {
        return userTiers[user] >= requiredTier;
    }
    
    // Custom transfer functions to make soulbound (non-transferable)
    function transferFrom(address from, address to, uint256 tokenId) public override {
        revert("TierNFT: Soulbound token - cannot be transferred");
    }
    
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public override {
        revert("TierNFT: Soulbound token - cannot be transferred");
    }
    
    // Token URI for metadata - simplified
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        uint256 tier = tokenTiers[tokenId];
        
        if (tier == SILVER_TIER) {
            return "data:application/json;base64,eyJuYW1lIjoiVHJhdmVsc3VyZSBUaWVyIC0gU2lsdmVyIiwgImRlc2NyaXB0aW9uIjoiVHJhdmVsc3VyZSBzdGFraW5nIHRpZXIgTkZUIGZvciBTaWx2ZXIgdGllciBiZW5lZml0cyIsICJpbWFnZSI6ImRhdGE6aW1hZ2Uvc3ZnK3htbDtiYXNlNjQsUEhOMlp5QjRiV3h1Y3owaWFIUjBjRG92TDNkM2R5NTNNeTV2Y21jdk1qQXdNQzl6ZG1jbklIQnNZV04wVW1GMGFXOXVnaUk2SWpBd01EQWlmUSIsICJhdHRyaWJ1dGVzIjpbeyJ0cmFpdF90eXBlIjoiVGllciIsICJ2YWx1ZSI6IlNpbHZlciJ9XX0=";
        } else if (tier == GOLD_TIER) {
            return "data:application/json;base64,eyJuYW1lIjoiVHJhdmVsc3VyZSBUaWVyIC0gR29sZCIsICJkZXNjcmlwdGlvbiI6IlRyYXZlbHN1cmUgc3Rha2luZyB0aWVyIE5GVCBmb3IgR29sZCB0aWVyIGJlbmVmaXRzIiwgImltYWdlIjoiZGF0YTppbWFnZS9zdmcreG1sO2Jhc2U2NCxQSE4yWnlCNGJXeHVjczBpYUhSMGNEb3ZMM2QzZHk1M015NXZjbWN2TWpBd01DOXpkbWNuSUhCc1lXTjBVbUYwYVc5dWdpSTZJakF3TURBZlgxOCJdLCImInRyYWl0X3R5cGUiOiJUaWVyIiwgInZhbHVlIjoiR29sZCJ9XX0=";
        } else if (tier == PLATINUM_TIER) {
            return "data:application/json;base64,eyJuYW1lIjoiVHJhdmVsc3VyZSBUaWVyIC0gUGxhdGludW0iLCAiZGVzY3JpcHRpb24iOiJUcmF2ZWxzdXJlIHN0YWtpbmcgdGllciBORlQgZm9yIFBsYXRpbnVtIHRpZXIgYmVuZWZpdHMiLCAiaW1hZ2UiOiJkYXRhOmltYWdlL3N2Zyt4bWw7YmFzZTY0LFBITjJaeUI0Yld4dWNzMGlhSFIwY0RvdkwzZDNkeTUzTXk1dmNtY3ZNakF3TUM5emRtY25JSEJzWVdOMFVtRjBhVzl1Z2lJNklqQXdNREFmWDkwIl0sIiZyYWl0X3R5cGUiOiJUaWVyIiwgInZhbHVlIjoiUGxhdGludW0ifV19";
        }
        
        return "data:application/json;base64,eyJuYW1lIjoiVHJhdmVsc3VyZSBUaWVyIiwgImRlc2NyaXB0aW9uIjoiVHJhdmVsc3VyZSBzdGFraW5nIHRpZXIgTkZUIn0=";
    }
    
}
