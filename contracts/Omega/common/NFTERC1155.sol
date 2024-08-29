// SPDX-License-Identifier: MIT
// Every.finance Contracts
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/**
 * @dev Implementation of the contract SafeHouseNonFungibeTokens.
 * It allows to manage deposits and withdrawals of Non Fungible Tokens.
 *
 */

contract NFTERC721 is ERC721 {
    constructor(
        string memory name,
        string memory symbol
    ) ERC721(name, symbol) {}

    function mint(address to, uint256 id) public {
        _mint(to, id);
    }
}
