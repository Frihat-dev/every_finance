// SPDX-License-Identifier: MIT
// Every.finance Contracts
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @dev Implementation of the contract Management.
 * It allows the manager to set the different parameters of the product.
 */
contract Management is AccessControlEnumerable {
    bytes32 public constant MANAGER = keccak256("MANAGER");
    bytes32 public constant ORACLE = keccak256("ORACLE");
    uint256 public constant SCALING_FACTOR = 1e8;

    struct Fee {
        uint256 rate;
        uint256 time;
    }

    struct Price {
        uint256 value;
        uint256 time;
    }

    struct DepositFee {
        uint256 rate;
        uint256 minValue;
        uint256 maxValue;
    }

    uint256 public managementFeeRate;
    uint256 public performanceFeeRate;
    uint256 public minDepositAmount;
    Price public tokenPrice;
    DepositFee public depositFee;
    Fee[] public withdrawalFee;
    bool public isCancelDeposit;
    bool public isCancelWithdrawal;
    address public treasury;
    address public safeHouse;

    event UpdateTreasury(address indexed treasury_);
    event UpdateSafeHouse(address indexed safeHouse_);
    event UpdateIsCancelDeposit(bool iscancelDeposit_);
    event UpdateIsCancelWithdrawal(bool isWithdrawalCancel_);
    event UpdateDepositFee(uint256 rate_, uint256 minValue_, uint256 maxValue_);
    event UpdateManagementFeeRate(uint256 managementFeeRate_);
    event UpdatePerformanceFeeRate(uint256 performanceFeeRate_);
    event UpdateMinDepositAmount(uint256 minDepositAmount_);
    event UpdateTokenPrice(Price price_);
    event AddWithdrawalFee(uint256 rate_, uint256 time_);
    event UpdateWithdrawalFee(uint256 index_, uint256 rate_, uint256 time_);
    event DeleteLastWithdrawalFee(uint256 rate_, uint256 time_);

    constructor(address admin_, address manager_, address treasury_) {
        require(admin_ != address(0), "Every.finance: zero address");
        require(manager_ != address(0), "Every.finance: zero address");
        require(treasury_ != address(0), "Every.finance: zero address");
        treasury = treasury_;
        _setupRole(DEFAULT_ADMIN_ROLE, admin_);
        _setupRole(MANAGER, manager_);
    }

    /**
     * @dev Update treasury.
     * @param treasury_.
     * Emits an {UpdateTreasury} event indicating the updated treasury `treasury_`.
     */
    function updateTreasury(
        address treasury_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(treasury_ != address(0), "Every.finance: zero address");
        require(treasury != treasury_, "Every.finance: no change");
        treasury = treasury_;
        emit UpdateTreasury(treasury_);
    }

    /**
     * @dev Update safeHouse.
     * @param safeHouse_.
     * Emits an {UpdateSafeHouse} event indicating the updated safeHouse `safeHouse_`.
     */
    function updateSafeHouse(
        address safeHouse_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(safeHouse_ != address(0), "Every.finance: zero address");
        require(safeHouse != safeHouse_, "Every.finance: no change");
        safeHouse = safeHouse_;
        emit UpdateSafeHouse(safeHouse_);
    }

    /**
     * @dev Update isCancelDeposit.
     * @param  isCancelDeposit_.
     * Emits an {UpdateIsCancelDeposit} event indicating the updated  isCancelDeposit ` isCancelDeposit_`.
     */
    function updateIsCancelDeposit(
        bool isCancelDeposit_
    ) external onlyRole(MANAGER) {
        require(
            isCancelDeposit_ != isCancelDeposit,
            "Every.finance: no change"
        );
        isCancelDeposit = isCancelDeposit_;
        emit UpdateIsCancelDeposit(isCancelDeposit_);
    }

    /**
     * @dev Update isCancelWithdrawal.
     * @param  isCancelWithdrawal_.
     * Emits an {UpdateIsCancelWithdrawal} event indicating the updated  isCancelWithdrawal ` isCancelWithdrawal_`.
     */
    function updateIsCancelWithdrawal(
        bool isCancelWithdrawal_
    ) external onlyRole(MANAGER) {
        require(
            isCancelWithdrawal_ != isCancelWithdrawal,
            "Every.finance: no change"
        );
        isCancelWithdrawal = isCancelWithdrawal_;
        emit UpdateIsCancelWithdrawal(isCancelWithdrawal_);
    }

    /**
     * @dev Update depositFee.
     * @param  rate_.
     * @param  minValue_.
     * @param  maxValue_.
     * Emits an {UpdateDepositFee} event indicating the updated rate `rate_`, min value `minValue_`
     * and max value `maxValue_`
     */
    function updateDepositFee(
        uint256 rate_,
        uint256 minValue_,
        uint256 maxValue_
    ) external onlyRole(MANAGER) {
        require(rate_ <= SCALING_FACTOR, "Every.finance: out of range");
        require(
            minValue_ <= maxValue_,
            "Every.finance: wrong min max values"
        );
        depositFee = DepositFee(rate_, minValue_, maxValue_);
        emit UpdateDepositFee(rate_, minValue_, maxValue_);
    }

    /**
     * @dev Update managementFeeRate.
     * @param managementFeeRate_.
     * Emits an {UpdateManagementFeeRate} event indicating the updated managementFeeRate `managementFeeRate_`.
     */

    function updateManagementFeeRate(
        uint256 managementFeeRate_
    ) external onlyRole(MANAGER) {
        require(
            managementFeeRate_ <= SCALING_FACTOR,
            "Every.finance: out of range"
        );
        managementFeeRate = managementFeeRate_;
        emit UpdateManagementFeeRate(managementFeeRate_);
    }

    /**
     * @dev Update performanceFeeRate.
     * @param performanceFeeRate_.
     * Emits an {UpdatePerformanceFeeRate} event indicating the updated performanceFeeRate `performanceFeeRate_`.
     */

    function updatePerformanceFeeRate(
        uint256 performanceFeeRate_
    ) external onlyRole(MANAGER) {
        require(
            performanceFeeRate_ <= SCALING_FACTOR,
            "Every.finance: out of range"
        );
        performanceFeeRate = performanceFeeRate_;
        emit UpdatePerformanceFeeRate(performanceFeeRate_);
    }

    /**
     * @dev Update MinDepositAmount.
     * @param minDepositAmount_.
     * Emits an {UpdateMinDepositAmount} event indicating the updated minDepositAmount `minDepositAmount_`.
     */

    function updateMinDepositAmount(
        uint256 minDepositAmount_
    ) external onlyRole(MANAGER) {
        require(
            depositFee.minValue <= minDepositAmount_,
            "Every.finance: lower than min deposit fee"
        );
        minDepositAmount = minDepositAmount_;
        emit UpdateMinDepositAmount(minDepositAmount_);
    }

    /**
     * @dev Update tokenPrice.
     * @param price_.
     * Emits an {UpdateTokenPrice} event indicating the updated tokenPrice.
     */
    function updateTokenPrice(uint256 price_) external onlyRole(ORACLE) {
        require(price_ != 0, "Every.finance: zero price");
        tokenPrice = Price(price_, block.timestamp);
        emit UpdateTokenPrice(tokenPrice);
    }

    /**
     * @dev add a new withdrawal fee.
     * @param rate_.
     * @param time_.
     * Emits an {AddWithdrawalFee} event with feeRate `rate_` and feePeriod `time_`.
     */

    function addWithdrawalFee(
        uint256 rate_,
        uint256 time_
    ) external onlyRole(MANAGER) {
        require(rate_ <= SCALING_FACTOR, "Every.finance: out of range");
        uint256 size_ = withdrawalFee.length;
        if (size_ != 0) {
            require(
                withdrawalFee[size_ - 1].time < time_,
                "Every.finance: times don't match"
            );
            require(
                withdrawalFee[size_ - 1].rate > rate_,
                "Every.finance: fee rates don't match"
            );
        }
        withdrawalFee.push(Fee(rate_, time_));
        emit AddWithdrawalFee(rate_, time_);
    }

    /**
     * @dev Update withdrawal fee.
     * @param index_ index of array withdrawalFee to be updated.
     * @param rate_ new fee.
     * @param time_ new period.
     * Emits an {UpdateWithdrawalFee} event with `index_`, `rate_`, and 'time_'.
     */

    function updateWithdrawalFee(
        uint256 index_,
        uint256 rate_,
        uint256 time_
    ) external onlyRole(MANAGER) {
        require(rate_ <= SCALING_FACTOR, "Every.finance: out of range");
        uint256 size_ = withdrawalFee.length;
        require(index_ < size_, "Every.finance: out of size");
        if (index_ != 0) {
            require(
                withdrawalFee[index_ - 1].time < time_,
                "Every.finance: times don't match"
            );
            require(
                withdrawalFee[index_ - 1].rate > rate_,
                "Every.finance: fee rates don't match"
            );
        }
        if (index_ < size_ - 1) {
            require(
                withdrawalFee[index_ + 1].time > time_,
                "Every.finance: times don't match"
            );
            require(
                withdrawalFee[index_ + 1].rate < rate_,
                "Every.finance: fee rates don't match"
            );
        }
        withdrawalFee[index_] = Fee(rate_, time_);
        emit UpdateWithdrawalFee(index_, rate_, time_);
    }

    /**
     * @dev delete last fee from  withdrawalFee.
     * Emits an {DeleteLastWithdrawalFee} event with the removed fee.
     */

    function deleteLastWithdrawalFee() external onlyRole(MANAGER) {
        uint256 size_ = withdrawalFee.length;
        require(size_ != 0, "Every.finance. array is empty");
        Fee memory fee_ = withdrawalFee[size_ - 1];
        withdrawalFee.pop();
        emit DeleteLastWithdrawalFee(fee_.rate, fee_.time);
    }

    /**
     * @dev calculate withdrawal fee rate.
     * @param holdTime_ hold time of the yield-bearing tokens.
     */

    function calculateWithdrawalFeeRate(
        uint256 holdTime_
    ) public view returns (uint256) {
        uint256 size_ = withdrawalFee.length;
        require(block.timestamp >= holdTime_, "Every.finance: max time");
        uint256 deltaTime_;
        unchecked {
            deltaTime_ = block.timestamp - holdTime_;
        }
        if (size_ == 0) {
            return 0;
        } else if (deltaTime_ <= withdrawalFee[0].time) {
            return withdrawalFee[0].rate;
        } else if (deltaTime_ > withdrawalFee[size_ - 1].time) {
            return 0;
        } else {
            uint256 time_;
            Fee memory fee_;
            for (uint256 i = 0; i < size_ - 1; ) {
                time_ = withdrawalFee[i].time;
                fee_ = withdrawalFee[i + 1];
                if ((deltaTime_ > time_) && (deltaTime_ <= fee_.time)) {
                    return fee_.rate;
                }
                unchecked {
                    i++;
                }
            }
            return 0;
        }
    }

    /**
     * @dev get deposit fee.
     * @param amount_ deposit amount.
     * @return fee_ deposit fee.
     */
    function getDepositFee(uint256 amount_) public view returns (uint256 fee_) {
        DepositFee memory depositFee_ = depositFee;
        fee_ = Math.max(
            Math.mulDiv(depositFee_.rate, amount_, SCALING_FACTOR),
            depositFee_.minValue
        );
        fee_ = Math.min(fee_, depositFee_.maxValue);
    }

    /**
     * @dev get token price.
     */
    function getTokenPrice() public view returns (Price memory) {
        return tokenPrice;
    }

    /**
     * @dev get withdrawal fee rate.
     * @param holdTime_ hold time of the yield-bearing tokens.
     * @return feeRate_ withdrawal fee rate.
     */
    function getWithdrawalFeeRate(
        uint256 holdTime_
    ) public view returns (uint256 feeRate_) {
        feeRate_ = calculateWithdrawalFeeRate(holdTime_);
    }

    /**
     * @dev get withdrawal fee.
     * @param index_ index of array withdrawal fee.
     * @return fee_ withdrawal fee.
     */
    function getWithdrawalFee(
        uint256 index_
    ) public view returns (Fee memory fee_) {
        require(
            index_ < withdrawalFee.length,
            "Every.finance. out of size"
        );
        fee_ = withdrawalFee[index_];
    }

    /**
     * @dev get withdrawalFee size.
     */

    function getWithdrawalFeeSize() public view returns (uint256) {
        return withdrawalFee.length;
    }
}
