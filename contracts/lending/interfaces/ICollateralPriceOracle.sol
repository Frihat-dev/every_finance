// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

interface ICollateralPriceOracle {
    event UpdateAssetPriceOracle(address indexed assetPriceOracle_);

    function updateAssetPriceOracle(address assetPriceOracle_) external;

    function getCollateralPrice(
        address collateral_,
        address asset0,
        address asset1
    ) external view returns (uint256);
}
