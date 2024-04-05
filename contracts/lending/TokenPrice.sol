// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "./libraries/ConstantLib.sol";
import "./libraries/ABDKMath64x64.sol";

contract TokenPrice {
    function calculateTokenPrice(
        uint256 currentPrice_,
        uint256 lastTime_,
        uint256 lastBlock_,
        uint256 netInterestRate_
    ) external view returns (uint256 price_) {
        uint256 nbBlocks_ = block.number - lastBlock_;
        uint256 meanTimePerBlock = (block.timestamp - lastTime_) / nbBlocks_;
        netInterestRate_ =
            (netInterestRate_ * meanTimePerBlock) /
            SECONDES_PER_YEAR;
        price_ = calculateCompound(netInterestRate_, currentPrice_, nbBlocks_);
    }

    function calculateCompound(
        uint256 ratio,
        uint256 principal,
        uint256 n
    ) public pure returns (uint256) {
        return
            ABDKMath64x64.mulu(
                ABDKMath64x64.pow(
                    ABDKMath64x64.add(
                        ABDKMath64x64.fromUInt(1),
                        ABDKMath64x64.divu(ratio, DECIMAL_FACTOR)
                    ),
                    n
                ),
                principal
            );
    }
}
