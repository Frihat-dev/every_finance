// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "../common/Proof.sol";

/**
 * @author Every.finance.
 * @notice Implementation of the contract WithdrawalProofBeta.
 */
contract WithdrawalProofBeta is Proof {
    constructor(address admin_) Proof("WBETA", "WBETA", 0, admin_) {}
}
