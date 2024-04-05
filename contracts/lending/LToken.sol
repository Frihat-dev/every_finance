// SPDX-License-Identifier: MIT
// Securd Contracts
pragma solidity ^0.8.8;

import "./Token.sol";

/**
 * @dev Implementation of the yield-bearing token sToken {ERC20}.
 */

contract LToken is Token {
    constructor(
        string memory name_,
        string memory symbol_,
        address lendingPool_
    ) Token(name_, symbol_, lendingPool_) {}

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256
    ) internal virtual override {
        require(
            (to == address(0)) || (from == address(0)),
            "Securd: transfer not allowed"
        );
    }
}
