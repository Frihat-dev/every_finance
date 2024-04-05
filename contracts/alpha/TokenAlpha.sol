// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "../common/Token.sol";

/**
 * @author Every.finance.
 * @notice Implementation of the contract TokenAlpha.
 */

contract TokenAlpha is Token {
    constructor(
        address flowTimeStorage_,
        address admin_
    ) Token("ALPHA", "ALPHA", flowTimeStorage_, admin_) {}
}
