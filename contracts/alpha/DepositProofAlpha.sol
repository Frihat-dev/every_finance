// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "../common/Proof.sol";

/**
 * @author Every.finance.
 * @notice Implementation of the contract DepositProofAlpha.
 */
contract DepositProofAlpha is Proof {
    constructor(address admin_) Proof("DALPHA", "DALPHA", 1, admin_) {}
}
