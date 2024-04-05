// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./libraries/ConstantLib.sol";

contract AssetPriceOracle is AccessControlEnumerable {
    using Math for uint256;
    mapping(address => address) public oracles;

    event UpdateOracle(address indexed asset_, address indexed oracle_);

    constructor(address admin_) {
        require(admin_ != address(0), "Securd: zero address");
        _setupRole(DEFAULT_ADMIN_ROLE, admin_);
    }

    function updateOracle(
        address asset_,
        address oracle_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(oracle_ != address(0), "Securd: zero address");
        oracles[asset_] = oracle_;
        emit UpdateOracle(asset_, oracle_);
    }

    function getAssetPrice(
        address asset_
    ) external view returns (uint256 price_) {
        require(oracles[asset_] != address(0), "Securd: asset is not listed");
        address oracle_ = oracles[asset_];
        AggregatorV3Interface priceFeed = AggregatorV3Interface(oracle_);
        (
            ,
            /*uint80 roundID*/ int price /*uint startedAt*/ /*uint timeStamp*/ /*uint80 answeredInRound*/,
            ,
            ,

        ) = priceFeed.latestRoundData();
        require(price > 0, "Transformative.Fi: invalid price");
        uint8 decimals_ = priceFeed.decimals();
        return (uint256(price) * DECIMAL_FACTOR) / 10 ** decimals_;
    }
}
