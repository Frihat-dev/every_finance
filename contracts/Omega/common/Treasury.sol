// SPDX-License-Identifier: MIT
// Every.finance Contracts
pragma solidity ^0.8.4;
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "../libraries/AssetTransfer.sol";

/**
 * @author Every.finance.
 * @notice Implementation of Treasury contract.
 */

contract Treasury is AccessControlEnumerable {
    bytes32 public constant WITHDRAWER = keccak256("WITHDRAWER");

    event SendTo(address indexed to_, uint256 amount_, address asset_);

    constructor(address admin_) payable {
        _setupRole(DEFAULT_ADMIN_ROLE, admin_);
    }

    receive() external payable {}

    /**
     * @dev Send asset `asset_` from the contract to address `to_`.
     * @param to_ receiver.
     * @param amount_ amount to send.
     * @param asset_ asset's address.
     * Emits an {SendTo} event with `to_`, `amount_` and `asset_`.
     */

    function sendTo(
        address to_,
        uint256 amount_,
        address asset_
    ) public onlyRole(WITHDRAWER) {
        require(to_ != address(0), "Every.finance: zero address");
        AssetTransfer.transfer(to_, amount_, asset_);
        emit SendTo(to_, amount_, asset_);
    }
}
