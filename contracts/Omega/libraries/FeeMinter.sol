// SPDX-License-Identifier: MIT
// Every.finance Contracts
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "./AssetTransfer.sol";
import "../common/Treasury.sol";
import "../common/Token.sol";

/**
 * @dev Implementation of the library FeeMinter that proposes functions to calculate and mint different fee.
 */

library FeeMinter {
    uint256 public constant SCALING_FACTOR = 1e18;
    uint256 public constant SECONDES_PER_YEAR = 365 days;

    /**
     * @dev calculate and mint performance fee.
     * performance fee is generated when the current price is above the average price.
     * Performance fee is minted in yield-bearing token for the treasury.
     * @param tokenPrice_ current price of the yield-bearing token.
     * @param tokenPriceMean_ average price of the yield-bearing token.
     * @param performanceFeeRate_ performance fee rate. Its precision factor is SCALING_FACTOR.
     * @param treasury_ treasury
     * @param token_  yield-bearing token's address.
     */
    function mintPerformanceFee(
        uint256 tokenPrice_,
        uint256 tokenPriceMean_,
        uint256 performanceFeeRate_,
        address treasury_,
        address token_
    ) internal returns (uint256, uint256) {
        Token tokenERC20_ = Token(token_);
        uint256 performanceFee_;
        if (tokenPrice_ > tokenPriceMean_) {
            uint256 deltaPrice_;
            unchecked {
                deltaPrice_ = tokenPrice_ - tokenPriceMean_;
                tokenPriceMean_ = tokenPrice_;
            }
            performanceFee_ = Math.mulDiv(
                tokenERC20_.totalSupply(),
                (deltaPrice_ * performanceFeeRate_),
                (tokenPrice_ * SCALING_FACTOR)
            );

            tokenERC20_.mint(treasury_, performanceFee_);
        }
        return (tokenPriceMean_, performanceFee_);
    }

    /**
     * @dev calculate and mint management fee.
     * management fee is minted in yield-bearing token for the treasury.
     * @param managementFeeLastTime_  last time at wich the management fee is calculated.
     * @param managementFeeRate_ management fee rate. Its precision factor is SCALING_FACTOR.
     * @param treasury_ treasury
     * @param token_  yield-bearing token's address.
     */
    function mintManagementFee(
        uint256 managementFeeLastTime_,
        uint256 managementFeeRate_,
        address treasury_,
        address token_
    ) internal returns (uint256, uint256) {
        uint256 managementFee_;
        if (managementFeeLastTime_ != 0) {
            Token tokenERC20_ = Token(token_);
            uint256 deltaTime_ = block.timestamp - managementFeeLastTime_;
            managementFee_ = Math.mulDiv(
                tokenERC20_.totalSupply(),
                (managementFeeRate_ * deltaTime_),
                (SCALING_FACTOR * SECONDES_PER_YEAR)
            );
            managementFeeLastTime_ = block.timestamp;
            tokenERC20_.mint(treasury_, managementFee_);
        }
        return (managementFeeLastTime_, managementFee_);
    }

    /**
     * @dev calculate and mint investment fee (ie. slippage fee)
     * investment fee is minted in yield-bearing token for the treasury.
     * investment fee can be negative (cost: isFee == true) or positive (profit: isFee == false).
     * if investment fee is negative, the manager can verify if he can get from the treasury the underlying  asset ,
     * and mint for it the equivalent amount in yield-bearing token.
     * if investment fee is positive, the manager can verify if he can send to the treasury the underlying  asset ,
     * and burn form it the equivalent amount in yield-bearing token.
     * @param amount_ amount of fee in yield-bearing token.
     * @param tokenPrice_ current token price.
     * @param isFee_ true if positive fee, false otherwise.
     * @param treasury_ treasury
     * @param token_  yield-bearing token's address.
     * @param asset_  asset's address.
     */
    function MintInvestmentFee(
        uint256 amount_,
        uint256 tokenPrice_,
        bool isFee_,
        address payable treasury_,
        address token_,
        address asset_
    ) internal returns (uint256) {
        require(amount_ != 0, "Every.finance: zero amount");

        uint256 assetBalanceTreasury_ = _getBalance(asset_, treasury_);
        uint256 tokenBalanceTreasury_ = IERC20(token_).balanceOf(treasury_);

        if (isFee_) {
            return
                _mintNegativeInvestmentFee(
                    amount_,
                    assetBalanceTreasury_,
                    tokenPrice_,
                    treasury_,
                    address(token_),
                    asset_
                );
        } else {
            return
                _burnPositiveInvestmentFee(
                    amount_,
                    tokenBalanceTreasury_,
                    tokenPrice_,
                    treasury_,
                    address(token_),
                    asset_
                );
        }
    }

    /**
     * @dev get asset's balance of the treasury.
     * @param asset_  asset's addres.
     * @param treasury_ treasury
     */
    function _getBalance(
        address asset_,
        address treasury_
    ) internal view returns (uint256 balance_) {
        if (asset_ == address(0)) {
            balance_ = treasury_.balance;
        } else {
            balance_ = IERC20(asset_).balanceOf(treasury_);

            (bool success_, uint8 assetDecimals_) = AssetTransfer
                .tryGetAssetDecimals(IERC20(asset_));
            require(success_, "Every.finance: no decimal");
            require(
                assetDecimals_ <= uint8(18),
                "Every.finance: max decimal"
            );
            unchecked {
                assetDecimals_ = uint8(18) - assetDecimals_;
            }
            balance_ = balance_ * 10 ** assetDecimals_;
        }
    }

    /**
     * @dev calculate and mint negative investment fee (ie. slippage fee)
     * investment fee is minted in yield-bearing token for the treasury.
     * the function verifies if it's possible to get from the treasury the underlying  asset ,
     * and mint for it the equivalent amount in yield-bearing token.
     * @param amount_ amount of fee in yield-bearing token.
     * @param assetBalanceTreasury_ asset's balance of the treasury.
     * @param tokenPrice_ current token price.
     * @param treasury_ treasury
     * @param token_ yield-bearing token's address.
     * @param asset_ asset's address.
     */
    function _mintNegativeInvestmentFee(
        uint256 amount_,
        uint256 assetBalanceTreasury_,
        uint256 tokenPrice_,
        address payable treasury_,
        address token_,
        address asset_
    ) internal returns (uint256 remainingAmount_) {
        uint256 deltaAmount_ = Math.min(amount_, assetBalanceTreasury_);
        if (deltaAmount_ != 0) {
            Token tokenERC20_ = Token(token_);
            Treasury(treasury_).sendTo(address(this), deltaAmount_, asset_);
            uint256 tokenAmount_ = Math.mulDiv(
                deltaAmount_,
                SCALING_FACTOR,
                tokenPrice_
            );
            tokenERC20_.mint(treasury_, tokenAmount_);
            unchecked {
                remainingAmount_ = amount_ - deltaAmount_;
            }
        } else {
            remainingAmount_ = amount_;
        }
    }

    /**
     * @dev calculate and burn positive investment fee (ie. slippage fee)
     * investment fee is burned in yield-bearing token from the treasury.
     * the function verifies if it's possible to send to the treasury the underlying  asset ,
     * and burn  from it the equivalent amount in yield-bearing token.
     * @param amount_ amount of fee in yield-bearing token.
     * @param tokenBalanceTreasury_ yield-bearing token's balance of the treasury.
     * @param tokenPrice_ current token price.
     * @param treasury_ treasury
     * @param token_ yield-bearing token's address.
     * @param asset_ asset's address.
     */
    function _burnPositiveInvestmentFee(
        uint256 amount_,
        uint256 tokenBalanceTreasury_,
        uint256 tokenPrice_,
        address treasury_,
        address token_,
        address asset_
    ) internal returns (uint256 remainingAmount_) {
        uint256 tokenAmount_ = Math.mulDiv(
            amount_,
            SCALING_FACTOR,
            tokenPrice_
        );
        tokenAmount_ = Math.min(tokenAmount_, tokenBalanceTreasury_);
        uint256 deltaAmount_;
        if (tokenAmount_ != 0) {
            Token tokenERC20_ = Token(token_);
            deltaAmount_ = Math.mulDiv(
                tokenAmount_,
                tokenPrice_,
                SCALING_FACTOR
            );
            AssetTransfer.transfer(treasury_, deltaAmount_, asset_);
            tokenERC20_.burn(treasury_, tokenAmount_);
        }
        unchecked {
            remainingAmount_ = amount_ - deltaAmount_;
        }
    }
}
