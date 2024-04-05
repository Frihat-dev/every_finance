// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "../common/Investment.sol";

/**
 * @author Every.finance.
 * @notice Implementation of the contract InvestmentAlpha.
 */

contract InvestmentAlpha is Investment {
    constructor(
        address asset_,
        address token_,
        address management_,
        address deposit_,
        address withdrawal_,
        address admin_
    )
        Investment(
            0,
            asset_,
            token_,
            management_,
            deposit_,
            withdrawal_,
            admin_
        )
    {}
}
