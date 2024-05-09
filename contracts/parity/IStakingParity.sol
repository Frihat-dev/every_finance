// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IStakingParity {
    function _updateReward(uint256 tokenId_) external;

    function _updateReward() external;

    function holders(uint256 tokenId_) external returns (address);
}
