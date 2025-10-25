// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract MockAavePool is ReentrancyGuard, Ownable {
    struct ReserveData {
        uint128 liquidityIndex;
        uint128 currentLiquidityRate;
        uint40 lastUpdateTimestamp;
        address aTokenAddress;
    }

    IERC20 public immutable PYUSD;
    IERC20 public immutable aPYUSD;
    mapping(address => uint256) public supplies;
    mapping(address => uint256) public liquidityRates;
    uint256 public constant DEFAULT_RATE = 100000000000000000000000000;
    
    event Supply(address indexed asset, address indexed user, uint256 amount, uint16 referralCode);
    event Withdraw(address indexed asset, address indexed user, address indexed to, uint256 amount);

    constructor(address _pyusd, address _aPYUSD) Ownable(msg.sender) {
        PYUSD = IERC20(_pyusd);
        aPYUSD = IERC20(_aPYUSD);
        liquidityRates[address(PYUSD)] = DEFAULT_RATE;
    }

    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external nonReentrant {
        require(asset == address(PYUSD) && amount > 0 && onBehalfOf != address(0), "Invalid params");
        require(PYUSD.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        supplies[onBehalfOf] += amount;
        emit Supply(asset, onBehalfOf, amount, referralCode);
    }

    function withdraw(address asset, uint256 amount, address to) external nonReentrant returns (uint256 totalAmount) {
        require(asset == address(PYUSD) && amount > 0 && to != address(0), "Invalid params");
        require(supplies[msg.sender] >= amount, "Insufficient supply");
        supplies[msg.sender] -= amount;
        totalAmount = amount + ((amount * 10) / 100);
        require(PYUSD.balanceOf(address(this)) >= totalAmount, "Insufficient pool balance");
        require(PYUSD.transfer(to, totalAmount), "Transfer failed");
        emit Withdraw(asset, msg.sender, to, totalAmount);
    }

    function getReserveData(address /* asset */) external view returns (ReserveData memory result) {
        result.liquidityIndex = 1000000000000000000000000000;
        result.currentLiquidityRate = uint128(liquidityRates[address(PYUSD)]);
        result.lastUpdateTimestamp = uint40(block.timestamp);
        result.aTokenAddress = address(aPYUSD);
    }

    function setLiquidityRate(address asset, uint256 rate) external onlyOwner {
        liquidityRates[asset] = rate;
    }

    function addLiquidity(uint256 amount) external onlyOwner {
        require(PYUSD.transferFrom(msg.sender, address(this), amount), "Transfer failed");
    }
}
