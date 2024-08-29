// SPDX-License-Identifier: MIT
// Every.finance Contracts
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @dev Implementation of the contract HoldTime.
 * It allows to update average hold time of the yield-bearing token.
 */

contract HoldTime is Ownable {
    address public token;
    mapping(address => uint256) private holdTimes;

    event UpdateToken(address indexed token_);
    event UpdateHoldTime(
        address indexed account_,
        uint256 oldHoldTime_,
        uint256 newHoldTime_
    );

    /**
     * @dev Update token.
     * @param token_ token's address
     * @notice Emits a {UpdateToken} event indicating the updated token `token_`.
     */
    function updateToken(address token_) external onlyOwner {
        require(token_ != address(0), "Every.finance: zero address");
        require(token_ != token, "Every.finance: no change");
        token = token_;
        emit UpdateToken(token_);
    }

    /**
     * @dev update HoldTimes.
     * @param account_ account's address.
     * @param amount_  token amount.
     * Emits a {UpdateHoldTime} event with `account_`, `oldHoldTime_` and `newHoldTime_`.
     */
    function updateHoldTime(address account_, uint256 amount_) external {
        require(msg.sender == token, "Every.finance: caller is not token");
        uint256 oldAmount_ = IERC20(token).balanceOf(account_);
        uint256 oldHoldTime_ = holdTimes[account_];
        uint256 newHoldTime_ = (oldAmount_ *
            oldHoldTime_ +
            block.timestamp *
            amount_) / (oldAmount_ + amount_);
        holdTimes[account_] = newHoldTime_;
        emit UpdateHoldTime(account_, oldHoldTime_, newHoldTime_);
    }

    /**
     * @dev get hold time.
     * @param account_ investor's address.
     * @return time_ hold time.
     */
    function getHoldTime(address account_) public view returns (uint256 time_) {
        time_ = holdTimes[account_];
    }
}
