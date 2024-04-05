// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "../common/Proof.sol";

/**
 * @author Every.finance.
 * @notice Implementation of the contract WithdrawalProofGamma.
 */
contract WithdrawalProofGamma is Proof {
    constructor(address admin_) Proof("WGAMMA", "WGAMMA", 0, admin_) {}
}
