// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "../common/AssetBook.sol";

/**
 * @author Every.finance.
 * @notice Implementation of the contract AssetBookBeta.
 */

contract AssetBookBeta is AssetBook {
    constructor(address admin_, address manager_) AssetBook(admin_, manager_) {}
}
