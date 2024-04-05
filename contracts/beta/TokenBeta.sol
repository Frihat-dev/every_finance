// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "../common/Token.sol";

/**
 * @author Every.finance.
 * @notice Implementation of the contract TokenBeta.
 */

contract TokenBeta is Token {
    constructor(
        address flowTimeStorage_,
        address admin_
    ) Token("BETA", "BETA", flowTimeStorage_, admin_) {}
}
