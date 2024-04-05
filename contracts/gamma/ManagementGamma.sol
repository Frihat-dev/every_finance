// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "../common/Management.sol";

/**
 * @author Every.finance.
 * @notice Implementation of the contract ManagementGamma.
 */

contract ManagementGamma is Management {
    constructor(
        address admin_,
        address manager_,
        address treasury_
    ) Management(admin_, manager_, treasury_) {}
}
