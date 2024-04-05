// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "../common/Proof.sol";

/**
 * @author Every.finance.
 * @notice Implementation of the contract DepositProofBeta.
 */
contract DepositProofBeta is Proof {
    constructor(address admin_) Proof("DBETA", "DBETA", 1, admin_) {}
}
