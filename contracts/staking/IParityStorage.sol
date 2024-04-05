// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "./ParityData.sol";

/**
 * @author Formation.Fi.
 * @notice Implementation of the contract TokenParityStorage.
 */

interface IParityStorage {
    function weightsPerToken(uint256 id_) external view returns (Amount memory);

    function tokenBalancePerToken(
        uint256 id_
    ) external view returns (Amount memory);
}
