// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;
import "./libraries/ConstantLib.sol";

contract InterestRate {
    function CalculateInterestRate(
        uint256 minValue_,
        uint256 maxValue_,
        uint256 optimalUtilizationRate_,
        uint256 utilizationRate_,
        uint256 interestRate_
    ) external pure returns (uint256 newInterestRate_) {
        uint256 slope_;
        if (utilizationRate_ < optimalUtilizationRate_) {
            slope_ =
                ((optimalUtilizationRate_ - utilizationRate_) *
                    (interestRate_ - minValue_)) /
                (DECIMAL_FACTOR - utilizationRate_);
            newInterestRate_ = interestRate_ - slope_;
        } else {
            slope_ =
                ((utilizationRate_ - optimalUtilizationRate_) *
                    (maxValue_ - interestRate_)) /
                utilizationRate_;
            newInterestRate_ = interestRate_ + slope_;
        }
    }
}
