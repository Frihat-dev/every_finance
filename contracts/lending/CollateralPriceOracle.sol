// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "./interfaces/IUniswapV2Pair.sol";
import "./libraries/ConstantLib.sol";

contract CollateralPriceOracle is AccessControlEnumerable {
    using Math for uint256;
    bytes32 public constant ORACLE = keccak256("ORACLE");

    struct Price {
           uint256 value;
           uint256 lastUpdateTime;
   }

     mapping(address => Price) private tokenPrices;

    constructor(address admin_, address oracle_) {
        require(admin_ != address(0), "zero address");
        require(oracle_ != address(0), "zero address");
        _setupRole(DEFAULT_ADMIN_ROLE, admin_);
        _setupRole(DEFAULT_ADMIN_ROLE, oracle_);
    }

    function updateCollateralPrice(
        address token_ , uint256 price_)
     external onlyRole(ORACLE) {
        require(token_ != address(0), "zero address");
        tokenPrices[token_] = Price(price_, block.timestamp);
    }

    function getCollateralPrice(
        address token_
    ) public view returns (uint256, uint256) {
        require(token_ != address(0), "zero address");

        return (tokenPrices[token_].value, tokenPrices[token_].lastUpdateTime);
    }

}
