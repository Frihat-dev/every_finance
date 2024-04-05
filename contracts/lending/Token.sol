// SPDX-License-Identifier: MIT
// Securd Contracts
pragma solidity ^0.8.8;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @dev Implementation of the yield-bearing token sToken {ERC20}.
 */

contract Token is ERC20 {
    bytes32 public constant LENDING_POOL = keccak256("LENDING_POOL");
    address public lendingPool;

    event Mint(address indexed to_, uint256 amount_);
    event Burn(address indexed account_, uint256 amount_);

    constructor(
        string memory _name,
        string memory _symbol,
        address lendingPool_
    ) ERC20(_name, _symbol) {
        require(lendingPool_ != address(0), "Securd: zero address");
        lendingPool = lendingPool_;
    }

    modifier OnlyLendingPool() {
        require(msg.sender == lendingPool, "Securd: caller is not LendingPool");
        _;
    }

    /**
     * @dev mint `amount_` sToken for `to_`
     * @param to_ receiver's address.
     * @param amount_  amount to mint.
     * Emits an {Mint} event with `to_`, and `amount_`.
     */
    function mint(address to_, uint256 amount_) external OnlyLendingPool {
        _mint(to_, amount_);
        emit Mint(to_, amount_);
    }

    /**
     * @dev burn `amount_`Token for `from_`
     * @param from_ user's address.
     * @param amount_ amount to burn.
     * Emits an {Burn} event with `from_`, and `amount_`.
     */
    function burn(address from_, uint256 amount_) external OnlyLendingPool {
        require(amount_ != 0, "Securd: zero amount");
        _burn(from_, amount_);
        emit Burn(from_, amount_);
    }
}
