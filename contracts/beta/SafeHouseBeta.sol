// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "../common/SafeHouse.sol";

/**
 * @author Every.finance.
 * @notice Implementation of the contract SafeHouseBeta.
 */

contract SafeHouseBeta is SafeHouse {
    constructor(
        address assets_,
        address admin_,
        address manager_
    ) SafeHouse(assets_, admin_, manager_) {}
}
