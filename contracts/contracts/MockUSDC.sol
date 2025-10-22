// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @notice Mock USDC token for Sepolia testnet testing
 * @dev Free minting allowed for anyone - only use on testnet!
 */
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USD Coin", "USDC") {
        // Mint initial supply to deployer for liquidity
        _mint(msg.sender, 10_000_000 * 10 ** 6); // 10M USDC
    }

    /**
     * @notice Returns 6 decimals to match real USDC
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /**
     * @notice Free mint function for testnet users
     * @param to Address to mint tokens to
     * @param amount Amount to mint (in USDC base units, 6 decimals)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @notice Burn tokens from an address
     * @param from Address to burn from
     * @param amount Amount to burn
     */
    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
}

