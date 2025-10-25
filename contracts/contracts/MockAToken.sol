// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// Mock aToken (Aave interest-bearing token) for PYUSD
contract MockAToken is ERC20, Ownable {
    address public immutable UNDERLYING_ASSET;
    
    constructor(
        string memory name,
        string memory symbol,
        address underlyingAsset
    ) ERC20(name, symbol) Ownable(msg.sender) {
        UNDERLYING_ASSET = underlyingAsset;
    }
    
    // Mint aTokens (called by MockAavePool)
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    // Burn aTokens (called by MockAavePool)
    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
    
    // Get scaled balance (1:1 for simplicity)
    function scaledBalanceOf(address user) external view returns (uint256) {
        return balanceOf(user);
    }
    
    // Get total scaled supply
    function scaledTotalSupply() external view returns (uint256) {
        return totalSupply();
    }
}

