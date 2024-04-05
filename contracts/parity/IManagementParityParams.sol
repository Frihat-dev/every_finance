// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "./libraries/ParityData.sol";

interface IManagementParityParams {
    function getDepositFee(uint256 _amount) external view returns (uint256);

    function depositMinAmount() external view returns (uint256);

    function treasury() external view returns (address);

    function getWithdrawalVariableFeeData()
        external
        view
        returns (ParityData.Fee[] memory);

    function fixedWithdrawalFee() external view returns (uint256);

    function getRebalancingFee(uint256 _value) external view returns (uint256);
}
