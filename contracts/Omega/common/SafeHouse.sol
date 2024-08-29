// SPDX-License-Identifier: MIT
// Every.finance Contracts
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./AssetBook.sol";
import "../libraries/AssetTransfer.sol";

/**
 * @dev Implementation of the contract SafeHouse.
 * It allows to manage deposits, withdrawals and transfers of basket assets.
 *
 */

contract SafeHouse is AccessControlEnumerable, Pausable {
    using Math for uint256;
    bytes32 public constant MANAGER = keccak256("MANAGER");
    uint256 public constant FACTOR_DECIMALS = 8;
    uint256 public maxWithdrawalCapacity;
    uint256 public withdrawalCapacity;
    uint256 public priceToleranceRate;
    mapping(address => bool) public vaults;
    AssetBook public assetBook;

    event UpdateMaxWithdrawalCapacity(uint256 maxWithdrawalCapacity_);
    event UpdateWithdrawalCapacity(uint256 withdrawalCapacity_);
    event UpdatePriceToleranceRate(uint256 priceToleranceRate_);
    event UpdateAssetBook(address indexed assetBook_);
    event AddVault(address indexed vault_);
    event RemoveVault(address indexed vault_);
    event DepositAsset(
        address indexed sender_,
        address indexed asset_,
        uint256 amount_
    );
    event WithdrawAsset(
        address indexed receiver_,
        address indexed asset_,
        uint256 amount_
    );
    event SendToVault(
        address indexed asset_,
        address indexed vault_,
        uint256 amount_
    );

    constructor(address assetBook_, address admin_, address manager_) payable {
        require(assetBook_ != address(0), "Every.finance: zero address");
        require(admin_ != address(0), "Every.finance: zero address");
        require(manager_ != address(0), "Every.finance: zero address");
        assetBook = AssetBook(assetBook_);
        _setupRole(DEFAULT_ADMIN_ROLE, admin_);
        _setupRole(MANAGER, manager_);
    }

    receive() external payable {}

    /**
     * @dev Update maxWithdrawalCapacity: maximum withrawal capacity in USD.
     * @param  maxWithdrawalCapacity_.
     * Emits an {UpdateMaxWithdrawalCapacity} event indicating the updated maxWithdrawalCapacity `maxWithdrawalCapacity_`.
     */
    function updateMaxWithdrawalCapacity(
        uint256 maxWithdrawalCapacity_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        maxWithdrawalCapacity = maxWithdrawalCapacity_;
        emit UpdateMaxWithdrawalCapacity(maxWithdrawalCapacity_);
    }

    /**
     * @dev Update withdrawalCapacity: withrawal capacity in USD.
     * @param  withdrawalCapacity_.
     * Emits an {UpdateWithdrawalCapacity} event indicating the updated withdrawalCapacity `withdrawalCapacity_`.
     */
    function updateWithdrawalCapacity(
        uint256 withdrawalCapacity_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        withdrawalCapacity = withdrawalCapacity_;
        emit UpdateWithdrawalCapacity(withdrawalCapacity_);
    }

    /**
     * @dev Update priceToleranceRate: price tolerance to consider its possible fluctuations
     * @param  priceToleranceRate_.
     * Emits an {UpdatePriceToleranceRate} event indicating the updated priceToleranceRate `priceToleranceRate_`.
     */
    function updatePriceToleranceRate(
        uint256 priceToleranceRate_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            priceToleranceRate_ <= (10 ** FACTOR_DECIMALS),
            "Every.finance: out of range"
        );
        priceToleranceRate = priceToleranceRate_;
        emit UpdatePriceToleranceRate(priceToleranceRate_);
    }

    /**
     * @dev Update assetBook
     * @param assetBook_.
     * Emits an {UpdateAssetBook} event indicating the updated assetBook `assetBook_`.
     */
    function updateAssetBook(
        address assetBook_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(assetBook_ != address(0), "Every.finance: zero address");
        require(
            assetBook_ != address(assetBook),
            "Every.finance: no change"
        );
        assetBook = AssetBook(assetBook_);
        emit UpdateAssetBook(assetBook_);
    }

    /**
     * @dev add a valut.
     * a vault is a DeFi investment strategy contract.
     * The manager can transfer assets to a vault without any withdrawal capacity condition.
     * @param vault_ vault's address.
     * Emits an {AddVault} event indicating the added vault `vault_`.
     */
    function addVault(address vault_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(vault_ != address(0), "Every.finance: zero address");
        require(!vaults[vault_], "Every.finance: vault exists");
        vaults[vault_] = true;
        emit AddVault(vault_);
    }

    /**
     * @dev remove a valut.
     * a vault is a DeFi investment strategy contract.
     * @param vault_ vault's address.
     * Emits an {RemoveVault} event indicating the removed vault `vault_`.
     */
    function removeVault(address vault_) external onlyRole(MANAGER) {
        require(vaults[vault_], "Every.finance: no vault");
        vaults[vault_] = false;
        emit RemoveVault(vault_);
    }

    /**
     * @dev deposit an asset amount in the SafeHouse.
     * when the manager deposits an asset value in the safeHouse, withdrawalCapacity is increased by that value.
     * @param asset_ asset'address.
     * @param amount_  deposit amount.
     * Emits an {depositAsset} event with caller `msg.sender`, asset `asset_` and amount `amount_`.
     */
    function depositAsset(
        address asset_,
        uint256 amount_
    ) external payable whenNotPaused onlyRole(MANAGER) {
        require(amount_ > 0, "Every.finance: zero amount");
        uint256 price_;
        uint256 priceDecimals_;
        (price_, priceDecimals_) = getLatestPrice(asset_);
        withdrawalCapacity += Math.mulDiv(
            amount_,
            price_,
            (10 ** priceDecimals_)
        );
        if (asset_ == address(0)) {
            require(amount_ == msg.value, "Every.finance: wrong amount");
        } else {
            AssetTransfer.transferFrom(
                msg.sender,
                address(this),
                amount_,
                IERC20(asset_)
            );
        }
        emit DepositAsset(msg.sender, asset_, amount_);
    }

    /**
     * @dev withdraw an asset amount from the SafeHouse.
     * when the manager withdraws an asset value in the safeHouse, withdrawalCapacity is decreased by that value considering the price tolerance.
     * @param asset_ asset'address.
     * @param amount_ deposit amount.
     * Emits an {WithdrawAsset} event with caller `msg.sender`, asset `asset_` and amount `amount_`.
     */
    function withdrawAsset(
        address asset_,
        uint256 amount_
    ) external whenNotPaused onlyRole(MANAGER) {
        require(amount_ > 0, "Every.finance: zero amount");
        uint256 price_;
        uint256 priceDecimals_;
        (price_, priceDecimals_) = getLatestPrice(asset_);
        uint256 value_ = Math.mulDiv(amount_, price_, (10 ** priceDecimals_));
        require(
            Math.min(withdrawalCapacity, maxWithdrawalCapacity) >= value_,
            "Every.finance: maximum withdrawal amount"
        );
        unchecked {
            value_ -= Math.mulDiv(
                value_,
                priceToleranceRate,
                (10 ** FACTOR_DECIMALS)
            );
            withdrawalCapacity -= value_;
        }
        AssetTransfer.transfer(msg.sender, amount_, asset_);
        emit WithdrawAsset(msg.sender, asset_, amount_);
    }

    /**
     * @dev send an asset amount to a vault.
     * @param asset_ asset'address.
     * @param vault_ vault'address.
     * @param amount_ deposit amount.
     * Emits an {SendToVault} event with asset `asset_`, vault `vault_` and amount `amount_`.
     */
    function sendToVault(
        address asset_,
        address vault_,
        uint256 amount_
    ) external whenNotPaused onlyRole(MANAGER) {
        require(vaults[vault_], "Every.finance: no vault");
        (, , bool isValid_) = assetBook.assets(asset_);
        require(isValid_, "Every.finance: no asset");
        AssetTransfer.transfer(vault_, amount_, asset_);
        emit SendToVault(asset_, vault_, amount_);
    }

    /**
     * @dev get the last price of an asset.
     * @param asset_ asset'address.
     */
    function getLatestPrice(
        address asset_
    ) public view returns (uint256, uint256) {
        (address oracle_, uint256 price_, bool isValid_) = assetBook.assets(
            asset_
        );
        require(isValid_, "Every.finance: no asset");
        if (oracle_ == address(0)) {
            return (price_, FACTOR_DECIMALS);
        } else {
            AggregatorV3Interface priceFeed = AggregatorV3Interface(oracle_);
            (
                ,
                /*uint80 roundID*/ int price /*uint startedAt*/ /*uint timeStamp*/ /*uint80 answeredInRound*/,
                ,
                ,

            ) = priceFeed.latestRoundData();
            require(price > 0, "Every.finance: invalid price");
            uint8 decimals_ = priceFeed.decimals();
            return (uint256(price), decimals_);
        }
    }

    function pause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
