// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IMetadata {
    function render(uint256 _tokenId) external view returns (string memory);
}
