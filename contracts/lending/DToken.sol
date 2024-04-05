// SPDX-License-Identifier: MIT
// Securd Contracts
pragma solidity ^0.8.8;

import "./Token.sol";

/**
 * @dev Implementation of the debt token dToken {ERC20}.
 */

contract DToken is Token {
    constructor(
        string memory name_,
        string memory symbol_,
        address lendingPool_
    ) Token(name_, symbol_, lendingPool_) {}
}
