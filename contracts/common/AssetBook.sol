// SPDX-License-Identifier: MIT
// Every.finance Contracts
pragma solidity ^0.8.4;
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "../libraries/AssetTransfer.sol";

/**
 * @dev Implementation of the contract AssetBook.
 * It allows the manager to add and remove basket assets assets to the investment portfolio.
 */

contract AssetBook is AccessControlEnumerable {
    bytes32 public constant MANAGER = keccak256("MANAGER");

    struct Asset {
        address oracle;
        uint256 price;
        bool isValid;
    }
    mapping(address => Asset) public assets;
    address[] public assetsList;

    event UpdateAsset(address indexed asset_, address oracle_, uint256 price_);
    event RemoveAsset(address indexed asset_);

    constructor(address admin_, address manager_) {
        require(admin_ != address(0), "Every.finance: zero address");
        require(manager_ != address(0), "Every.finance: zero address");
        _setupRole(DEFAULT_ADMIN_ROLE, admin_);
        _setupRole(MANAGER, manager_);
    }

    /**
     * @dev get the size of array assetsList.
     */
    function getAssetsListSize() public view returns (uint256) {
        return assetsList.length;
    }

    /**
     * @dev get asset.
     * @param asset_ asset's address.
     */
    function getAsset(address asset_) public view returns (Asset memory) {
        return assets[asset_];
    }
    

    /**
     * @dev update an asset.
     * @param asset_ asset's address.
     * @param oracle_ oracle price address.
     * @param price_ asset's price if there is no oracle.
     * Emits a {UpdateAsset} event with `account_`, `oracle_` and `price_`.
     */
    function updateAsset(
        address asset_,
        address oracle_,
        uint256 price_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(!assets[asset_].isValid, "Every.finance: asset already exists");
        if (oracle_ == address(0)) {
            require(price_ != 0, "Every.finance: zero price");
        } else {
            require(price_ == 0, "Every.finance: not zero price");
        }
        assets[asset_] = Asset(oracle_, price_, true);
        assetsList.push(asset_);
        emit UpdateAsset(asset_, oracle_, price_);
    }

    /**
     * @dev remove an asset.
     * @param asset_ asset's address.
     * Emits a {RemoveAsset} event indicating the removed `asset_`.
     */
    function removeAsset(address asset_) external onlyRole(MANAGER) {
        require(assets[asset_].isValid, "Every.finance: no valid asset");
        assets[asset_].isValid = false;
        delete assets[asset_];
        emit RemoveAsset(asset_);
    }

}
