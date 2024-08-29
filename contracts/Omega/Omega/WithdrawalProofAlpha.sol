// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "../common/Proof.sol";

/**
 * @author Every.finance.
 * @notice Implementation of the contract WithdrawalProofAlpha.
 */
contract WithdrawalProofAlpha is Proof {
    constructor(address admin_) Proof("WALPHA", "WALPHA", 0, admin_) {}
}
