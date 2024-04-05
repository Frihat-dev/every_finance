// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @dev Implementation of the library AssetTransfer that proposes functions to transfer Ether/ERC20 asset.
 */
library AssetTransfer {
    using SafeERC20 for IERC20;

    /**
     * @dev transfer `amount_` of asset `asset_` from `from_` to `to_`.
     * @param from_ sender'address.
     * @param to_ receiver'address.
     * @param amount_ amount to send.
     * @param asset_ asset's IERC20 interface to send.Its decimal has to be lower than 18,
     * if it is ERC20.
     */
    function transferFrom(
        address from_,
        address to_,
        uint256 amount_,
        IERC20 asset_
    ) internal {
        (bool success_, uint8 assetDecimals_) = tryGetAssetDecimals(asset_);
        require(success_, "Transformative.Fi: no decimal");
        require(assetDecimals_ <= uint8(18), "Transformative.Fi: max decimal");
        unchecked {
            assetDecimals_ = uint8(18) - assetDecimals_;
        }
        amount_ = amount_ / 10 ** assetDecimals_;
        require(amount_ != 0, "Transformative.Fi: zero amount");
        asset_.safeTransferFrom(from_, to_, amount_);
    }

    /**
     * @dev transfer `amount_` of asset `asset_` to `to_`.
     * @param to_ receiver'address.
     * @param amount_ amount to send.
     * @param asset_ asset's address to send. Its decimal has to be lower than 18,
     * if it is ERC20.
     */
    function transfer(address to_, uint256 amount_, address asset_) internal {
        if (asset_ != address(0)) {
            (bool success_, uint8 assetDecimals_) = tryGetAssetDecimals(
                IERC20(asset_)
            );
            require(success_, "Transformative.Fi: no decimal");
            assetDecimals_ = uint8(18) - assetDecimals_;
            amount_ = amount_ / 10 ** assetDecimals_;
            require(amount_ != 0, "Transformative.Fi: zero amount");
            IERC20(asset_).safeTransfer(to_, amount_);
        } else {
            require(
                address(this).balance >= amount_,
                "Transformative.Fi: amount exceeds balance"
            );
            payable(to_).transfer(amount_);
        }
    }

    /**
     * @dev get asset's decimal.
     * @param asset_ asset's IERC20 interface.
     */
    function tryGetAssetDecimals(
        IERC20 asset_
    ) internal view returns (bool, uint8) {
        (bool success, bytes memory encodedDecimals) = address(asset_)
            .staticcall(
                abi.encodeWithSelector(IERC20Metadata.decimals.selector)
            );
        if (success && encodedDecimals.length >= 32) {
            uint256 returnedDecimals = abi.decode(encodedDecimals, (uint256));
            if (returnedDecimals <= type(uint8).max) {
                return (true, uint8(returnedDecimals));
            }
        }
        return (false, 0);
    }
}
