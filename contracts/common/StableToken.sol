// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract StableToken is ERC20, Ownable {
    uint8 decimal;

    constructor(uint8 _decimal) ERC20("StableCoin", "COIN") {
        decimal = _decimal;
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    function decimals() public view virtual override returns (uint8) {
        return decimal;
    }
}
