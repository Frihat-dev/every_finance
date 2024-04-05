// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

interface IAssetPriceOracle {
    event UpdateOracle(address indexed asset_, address indexed oracle_);

    function updateOracle(address asset_, address oracle_) external;

    function getAssetPrice(address asset_) external view returns (uint256);

    function oracles(address asset_) external view returns (uint256);
}
