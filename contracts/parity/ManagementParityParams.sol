// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./libraries/ParityData.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @author Every.finance.
 * @notice Implementation of the contract ManagementParityParams.
 */
contract ManagementParityParams is AccessControlEnumerable {
    using Math for uint256;
    bytes32 public constant MANAGER = keccak256("MANAGER");
    struct DepositFee {
        uint256 rate;
        uint256 minValue;
        uint256 maxValue;
    }
    uint256 public minDepositAmount;
    DepositFee public depositFee;
    DepositFee public rebalancingFee;
    uint256 public fixedWithdrawalFee;
    ParityData.Fee[] public variableWithdrawalFee;
    address public treasury;

    constructor(address admin_, address treasury_) {
        require(admin_ != address(0), "Every.finance: no manager");
        require(treasury_ != address(0), "Every.finance: no manager");
        treasury = treasury_;
        _setupRole(DEFAULT_ADMIN_ROLE, admin_);
    }

    function setTreasury(
        address _treasury
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_treasury != address(0), "Every.finance: zero address");
        treasury = _treasury;
    }

    function setMinDepositAmount(
        uint256 _minDepositAmount
    ) external onlyRole(MANAGER) {
        minDepositAmount = _minDepositAmount;
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
        require(
            rate_ <= ParityData.COEFF_SCALE_DECIMALS,
            "Transformative.Fi: out of range"
        );
        require(
            minValue_ <= maxValue_,
            "Transformative.Fi: wrong min max values"
        );
        depositFee = DepositFee(rate_, minValue_, maxValue_);
        //emit UpdateDepositFee(rate_, minValue_, maxValue_);
    }

    function updateRebalancingFee(
        uint256 rate_,
        uint256 minValue_,
        uint256 maxValue_
    ) external onlyRole(MANAGER) {
        require(
            rate_ <= ParityData.COEFF_SCALE_DECIMALS,
            "Transformative.Fi: out of range"
        );
        require(
            minValue_ <= maxValue_,
            "Transformative.Fi: wrong min max values"
        );
        rebalancingFee = DepositFee(rate_, minValue_, maxValue_);
        //emit UpdateRebalancingtFee(rate_, minValue_, maxValue_);
    }

    function setFixedWithdrawalFee(uint256 _value) external onlyRole(MANAGER) {
        fixedWithdrawalFee = _value;
    }

    /**
     * @dev add a new withdrawal fee.
     * @param rate_.
     * @param time_.
     * Emits an {AddWithdrawalFee} event with feeRate `rate_` and feePeriod `time_`.
     */

    function addVariableWithdrawalFee(
        uint256 rate_,
        uint256 time_
    ) external onlyRole(MANAGER) {
        require(
            rate_ <= ParityData.COEFF_SCALE_DECIMALS,
            "Transformative.Fi: out of range"
        );
        uint256 size_ = variableWithdrawalFee.length;
        if (size_ != 0) {
            require(
                variableWithdrawalFee[size_ - 1].time < time_,
                "Transformative.Fi: times don't match"
            );
            require(
                variableWithdrawalFee[size_ - 1].rate > rate_,
                "Transformative.Fi: fee rates don't match"
            );
        }
        variableWithdrawalFee.push(ParityData.Fee(rate_, time_));
        //emit AddWithdrawalFee(rate_, time_);
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
        require(
            rate_ <= ParityData.COEFF_SCALE_DECIMALS,
            "Transformative.Fi: out of range"
        );
        uint256 size_ = variableWithdrawalFee.length;
        require(index_ < size_, "Transformative.Fi: out of size");
        if (index_ != 0) {
            require(
                variableWithdrawalFee[index_ - 1].time < time_,
                "Transformative.Fi: times don't match"
            );
            require(
                variableWithdrawalFee[index_ - 1].rate > rate_,
                "Transformative.Fi: fee rates don't match"
            );
        }
        if (index_ < size_ - 1) {
            require(
                variableWithdrawalFee[index_ + 1].time > time_,
                "Transformative.Fi: times don't match"
            );
            require(
                variableWithdrawalFee[index_ + 1].rate < rate_,
                "Transformative.Fi: fee rates don't match"
            );
        }
        variableWithdrawalFee[index_] = ParityData.Fee(rate_, time_);
        //emit UpdatevariableWithdrawalFee(index_, rate_, time_);
    }

    /**
     * @dev delete last fee from  variableWithdrawalFee.
     * Emits an {DeleteLastvariableWithdrawalFee} event with the removed fee.
     */

    function deleteLastvariableWithdrawalFee() external onlyRole(MANAGER) {
        uint256 size_ = variableWithdrawalFee.length;
        require(size_ != 0, "Transformative.Fi. array is empty");
        //ParityData.Fee memory fee_ = variableWithdrawalFee[size_ - 1];
        variableWithdrawalFee.pop();
        //emit DeleteLastvariableWithdrawalFee(fee_.rate, fee_.time);
    }

    function getDepositFee(uint256 _value) public view returns (uint256 _fee) {
        _fee = Math.max(
            (depositFee.rate * _value) / ParityData.COEFF_SCALE_DECIMALS,
            depositFee.minValue
        );
        _fee = Math.min(_fee, depositFee.maxValue);
    }

    function getRebalancingFee(
        uint256 _value
    ) public view returns (uint256 _fee) {
        _fee = Math.max(
            (rebalancingFee.rate * _value) / ParityData.COEFF_SCALE_DECIMALS,
            rebalancingFee.minValue
        );
        _fee = Math.min(_fee, rebalancingFee.maxValue);
    }

    function getSizeVariablevariableWithdrawalFee()
        public
        view
        returns (uint256)
    {
        return variableWithdrawalFee.length;
    }

    function getVariablevariableWithdrawalFee(
        uint256 _index
    ) public view returns (uint256, uint256) {
        require(
            _index <= variableWithdrawalFee.length - 1,
            "Every.finance: out of range"
        );
        return (
            variableWithdrawalFee[_index].rate,
            variableWithdrawalFee[_index].time
        );
    }

    function getWithdrawalVariableFeeData()
        public
        view
        returns (ParityData.Fee[] memory)
    {
        uint256 _size = variableWithdrawalFee.length;
        ParityData.Fee[] memory _data = new ParityData.Fee[](_size);
        for (uint256 i = 0; i < _size; ++i) {
            _data[i] = variableWithdrawalFee[i];
        }
        return _data;
    }
}
