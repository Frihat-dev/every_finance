// SPDX-License-Identifier: MIT
// Every.finance Contracts
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "./HoldTime.sol";

/**
 * @dev Implementation of the yield-bearing tokens {ERC20}.
 */

contract Token is ERC20, AccessControlEnumerable {
    bytes32 public constant INVESTMENT = keccak256("INVESTMENT");
    address public investment;
    mapping(address => bool) public whitelist;
    HoldTime public holdTime;

    event UpdateInvestment(address indexed investment_);
    event UpdateHoldTime(address indexed holdTime_);
    event AddToWhiteList(address indexed address_);
    event RemoveFromWhiteList(address indexed address_);
    event Mint(address indexed to_, uint256 amount_);
    event Burn(address indexed account_, uint256 amount_);

    constructor(
        string memory _name,
        string memory _symbol,
        address holdTime_,
        address admin_
    ) ERC20(_name, _symbol) {
        require(holdTime_ != address(0), "Every.finance: zero address");
        require(admin_ != address(0), "Every.finance: zero address");

        _setupRole(DEFAULT_ADMIN_ROLE, admin_);
        holdTime = HoldTime(holdTime_);
    }

    /**
     * @dev Update investment.
     * @param investment_.
     * Emits an {UpdateInvestment} event indicating the updated investment `investment_`.
     */
    function updateInvestment(
        address investment_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(investment_ != address(0), "Every.finance: zero address");
        require(investment_ != investment, "Every.finance: no change");
        _revokeRole(INVESTMENT, investment);
        _grantRole(INVESTMENT, investment_);
        whitelist[investment] = false;
        whitelist[investment_] = true;
        investment = investment_;
        emit UpdateInvestment(investment_);
    }

    /**
     * @dev Update holdTime.
     * @param holdTime_.
     * Emits an {UpdateHoldTime} event indicating the updated holdTime `holdTime_`.
     */
    function updateHoldTime(
        address holdTime_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(holdTime_ != address(0), "Every.finance: zero address");
        require(holdTime_ != address(holdTime), "Every.finance: no change");
        holdTime = HoldTime(holdTime_);
        emit UpdateHoldTime(holdTime_);
    }

    /**
     * @dev Add `account_` to `whitelist `.
     * @param account_ .
     * Emits an {AddToWhiteList} event indicating the addedd address `account_`.
     */
    function addToWhiteList(
        address account_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(account_ != address(0), "Every.finance: zero address");
        require(!whitelist[account_], "Every.finance: address exists");
        whitelist[account_] = true;
        emit AddToWhiteList(account_);
    }

    /**
     * @dev remove `account_` from `whitelist `.
     * @param account_ .
     * Emits an {RemoveFromWhiteList} event indicating the deleted address `account_`.
     */
    function removeFromWhiteList(
        address account_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            whitelist[account_],
            "Every.finance: address doesn't exist"
        );
        whitelist[account_] = false;
        emit RemoveFromWhiteList(account_);
    }

    /**
     * @dev mint `amount_`Token for `to_`
     * @param to_ receiver's address.
     * @param amount_  amount to mint.
     * Emits an {Mint} event with `to_`, and `amount_`.
     */
    function mint(address to_, uint256 amount_) external onlyRole(INVESTMENT) {
        _mint(to_, amount_);
        emit Mint(to_, amount_);
    }

    /**
     * @dev burn `amount_`Token for `from_`
     * @param from_ user's address.
     * @param amount_ amount to burn.
     * Emits an {Burn} event with `from_`, and `amount_`.
     */
    function burn(
        address from_,
        uint256 amount_
    ) external onlyRole(INVESTMENT) {
        require(amount_ != 0, "Every.finance: zero amount");
        _burn(from_, amount_);
        emit Burn(from_, amount_);
    }

    /**
     * @dev get the average token hold time of `account_`
     * @param account_  user's address.
     * @return time_ average token hold time.
     */
    function getHoldTime(address account_) public view returns (uint256 time_) {
        time_ = holdTime.getHoldTime(account_);
    }

    /**
     * @dev update the average token hold time for `account_`.
     * @param account_ user's address.
     * @param amount_  new received token amount.
     */

    function _updateHoldTime(address account_, uint256 amount_) internal {
        require(amount_ != 0, "Every.finance: zero amount");
        holdTime.updateHoldTime(account_, amount_);
    }

    /**
     * @dev Hook that is called before any transfer of tokens. This includes
     * minting and burning. It permits to update the hold time of the receiver `to_` if :
     *  - the receiver's address `from_` is not zero nor whitelisted  and the sender is not whitelisted
     * @param from sender's address.
     * @param to receiver's address.
     * @param amount transferred amount.
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        if ((to != address(0)) && (!whitelist[from]) && (!whitelist[to])) {
            _updateHoldTime(to, amount);
        }
    }
}
