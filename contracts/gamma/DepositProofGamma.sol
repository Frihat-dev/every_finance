// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "../common/Proof.sol";

/**
 * @author Every.finance.
 * @notice Implementation of the contract DepositProofGamma.
 */
contract DepositProofGamma is Proof {
    constructor(address admin_) Proof("DGAMMA", "DGAMMA", 1, admin_) {}
}
