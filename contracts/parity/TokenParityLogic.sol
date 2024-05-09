// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "@openzeppelin/contracts/access/Ownable.sol";
import "./libraries/ParityStorageUpdate.sol";
import "./IManagementParity.sol";
import "./ISafeHouse.sol";
import "./IManagementParityParams.sol";

/**
 * @author Formation.Fi.
 * @notice Implementation of the contract TokenParityLogic.
 */

contract TokenParityLogic is Ownable {
    ParityData.Amount public depositBalance;
    ParityData.Amount public withdrawalBalance;
    ParityData.Amount public withdrawalRebalancingBalance;
    ParityData.Amount public depositRebalancingBalance;
    address public tokenParity;
    address public investmentParity;
    address public managementParity;
    mapping(uint256 => uint256) public optionPerToken;
    mapping(uint256 => uint256) public riskPerToken;
    mapping(uint256 => uint256) public returnPerToken;
    mapping(uint256 => ParityData.Amount) public weightsPerToken;
    mapping(uint256 => ParityData.Amount) public flowTimePerToken;
    mapping(uint256 => ParityData.Amount) public depositBalancePerToken;
    mapping(uint256 => ParityData.Amount) public withdrawalBalancePerToken;
    mapping(uint256 => ParityData.Amount)
        public depositRebalancingBalancePerToken;
    mapping(uint256 => ParityData.Amount)
        public withdrawalRebalancingBalancePerToken;
    mapping(uint256 => ParityData.Amount) public tokenBalancePerToken;
    mapping(uint256 => ParityData.Event[])
        public depositBalancePerTokenPerEvent;
    mapping(uint256 => ParityData.Event[])
        public withdrawalBalancePerTokenPerEvent;
    mapping(uint256 => ParityData.Event[])
        public depositRebalancingBalancePerTokenPerEvent;
    mapping(uint256 => ParityData.Event[])
        public withdrawalRebalancingBalancePerTokenPerEvent;
    mapping(uint256 => ParityData.Event[]) public tokenWithdrawalFee;
    mapping(uint256 => bool) public tokenIdsToRebalance;
    mapping(uint256 => ParityData.Position) public rebalancingRequests;
    ISafeHouse public safeHouse;
    IManagementParityParams public managementParityParams;

    modifier onlyManagementParity() {
        require(managementParity != address(0), "Formation.Fi: zero address");
        require(
            msg.sender == managementParity,
            "Formation.Fi: no ManagementParity"
        );
        _;
    }

    function setTokenParity(address _tokenParity) public onlyOwner {
        require(_tokenParity != address(0), "Formation.Fi: zero address");
        tokenParity = _tokenParity;
    }

    function setInvestmentParity(address _investmentParity) public onlyOwner {
        require(_investmentParity != address(0), "Formation.Fi: zero address");
        investmentParity = _investmentParity;
    }

    function setSafeHouse(address _safeHouse) public onlyOwner {
        require(_safeHouse != address(0), "Formation.Fi: zero address");
        safeHouse = ISafeHouse(_safeHouse);
    }

    function setmanagementParity(
        address _managementParity,
        address _managementParityParams
    ) public onlyOwner {
        require(_managementParity != address(0), "Formation.Fi: zero address");
        require(
            _managementParityParams != address(0),
            "Formation.Fi: zero address"
        );
        managementParity = _managementParity;
        managementParityParams = IManagementParityParams(
            _managementParityParams
        );
    }

    function updateTokenBalancePerToken(
        uint256 _tokenId,
        uint256 _amount,
        uint256 _id
    ) external onlyManagementParity {
        require(_id >= 0 && _id <= 2, "Formation.Fi: out of range");
        ParityStorageUpdate.updateTokenBalancePerToken(
            tokenBalancePerToken[_tokenId],
            flowTimePerToken[_tokenId],
            _amount,
            _id
        );
    }

    function updateDepositBalancePerToken(
        uint256 _tokenId,
        uint256 _amount,
        uint256 _indexEvent,
        uint256 _id
    ) external onlyManagementParity {
        ParityStorageUpdate.updateDataBalancePerToken(
            depositBalancePerToken[_tokenId],
            depositBalancePerTokenPerEvent[_tokenId],
            _amount,
            _indexEvent,
            _id
        );
    }

    function updateRebalancingDepositBalancePerToken(
        uint256 _tokenId,
        uint256 _amount,
        uint256 _indexEvent,
        uint256 _id
    ) external onlyManagementParity {
        ParityStorageUpdate.updateDataBalancePerToken(
            depositRebalancingBalancePerToken[_tokenId],
            depositRebalancingBalancePerTokenPerEvent[_tokenId],
            _amount,
            _indexEvent,
            _id
        );
    }

    function updateWithdrawalBalancePerToken(
        uint256 _tokenId,
        uint256 _amount,
        uint256 _indexEvent,
        uint256 _id
    ) external onlyManagementParity {
        ParityStorageUpdate.updateDataBalancePerToken(
            withdrawalBalancePerToken[_tokenId],
            withdrawalBalancePerTokenPerEvent[_tokenId],
            _amount,
            _indexEvent,
            _id
        );
    }

    function updateRebalancingWithdrawalBalancePerToken(
        uint256 _tokenId,
        uint256 _amount,
        uint256 _indexEvent,
        uint256 _id
    ) external onlyManagementParity {
        ParityStorageUpdate.updateDataBalancePerToken(
            withdrawalRebalancingBalancePerToken[_tokenId],
            withdrawalRebalancingBalancePerTokenPerEvent[_tokenId],
            _amount,
            _indexEvent,
            _id
        );
    }

    function updateTotalBalances(
        ParityData.Amount memory _depositAmount,
        ParityData.Amount memory _withdrawalAmount,
        ParityData.Amount memory _depositRebalancingAmount,
        ParityData.Amount memory _withdrawalRebalancingAmount
    ) external onlyManagementParity {
        ParityStorageUpdate.updateTotalBalances(
            depositBalance,
            withdrawalBalance,
            depositRebalancingBalance,
            withdrawalRebalancingBalance,
            _depositAmount,
            _withdrawalAmount,
            _depositRebalancingAmount,
            _withdrawalRebalancingAmount
        );
    }

    function _getTotalTokenValue(
        uint256 _tokenId,
        uint256[3] memory _price
    ) internal view returns (uint256 _totalValue) {
        _totalValue = ParityLogic.getTotalTokenValue(
            tokenBalancePerToken[_tokenId],
            depositBalancePerToken[_tokenId],
            depositRebalancingBalancePerToken[_tokenId],
            withdrawalBalancePerToken[_tokenId],
            _price
        );
    }

    function _getAvailableTokenValue(
        uint256 _tokenId,
        uint256 _indexEvent,
        uint256[3] memory _price
    ) internal view returns (uint256 _totalValue) {
        _totalValue = ParityLogic.getAvailableTokenValue(
            depositBalancePerTokenPerEvent[_tokenId],
            depositRebalancingBalancePerTokenPerEvent[_tokenId],
            tokenBalancePerToken[_tokenId],
            _indexEvent,
            _price
        );
    }

    function _getTokenValueToRebalance(
        uint256 _tokenId,
        uint256 _indexEvent,
        uint256[3] memory _price
    )
        internal
        view
        returns (
            uint256 _valueAlpha,
            uint256 _valueBeta,
            uint256 _valueGamma,
            uint256 _valueTotal
        )
    {
        (_valueAlpha, _valueBeta, _valueGamma, _valueTotal) = ParityLogic
            .getTokenValueToRebalance(
                depositBalancePerTokenPerEvent[_tokenId],
                depositRebalancingBalancePerTokenPerEvent[_tokenId],
                tokenBalancePerToken[_tokenId],
                _indexEvent,
                _price
            );
    }

    function _cancelRebalancing(
        uint256 _tokenId,
        uint256 _indexEvent,
        uint256[3] memory _price
    ) internal {
        uint256 _indexRebalancingDeposit;
        uint256 _indexRebalancingWithdrawal;
        uint256 _indexDeposit;
        _indexRebalancingDeposit = ParityLogic.searchIndexEvent(
            depositRebalancingBalancePerTokenPerEvent[_tokenId],
            _indexEvent
        );
        _indexRebalancingWithdrawal = ParityLogic.searchIndexEvent(
            withdrawalRebalancingBalancePerTokenPerEvent[_tokenId],
            _indexEvent
        );
        _indexDeposit = ParityLogic.searchIndexEvent(
            depositBalancePerTokenPerEvent[_tokenId],
            _indexEvent
        );
        ParityData.Amount memory _withdrawalRebalancingAmount;
        ParityData.Amount memory _depositRebalancingAmount;
        if (_indexRebalancingWithdrawal < ParityLogic.MAX_INDEX_EVENT) {
            _withdrawalRebalancingAmount = withdrawalRebalancingBalancePerTokenPerEvent[
                _tokenId
            ][_indexRebalancingWithdrawal].amount;
            ParityStorageUpdate.deleteEventData(
                withdrawalRebalancingBalancePerTokenPerEvent[_tokenId],
                _indexRebalancingWithdrawal
            );
        }
        if (_indexRebalancingDeposit < ParityLogic.MAX_INDEX_EVENT) {
            _depositRebalancingAmount = depositRebalancingBalancePerTokenPerEvent[
                _tokenId
            ][_indexRebalancingDeposit].amount;
            ParityStorageUpdate.deleteEventData(
                depositRebalancingBalancePerTokenPerEvent[_tokenId],
                _indexRebalancingDeposit
            );
        }

        ParityMath.add(
            tokenBalancePerToken[_tokenId],
            _withdrawalRebalancingAmount
        );
        ParityMath.sub(
            withdrawalRebalancingBalancePerToken[_tokenId],
            _withdrawalRebalancingAmount
        );
        ParityMath.sub(
            withdrawalRebalancingBalance,
            _withdrawalRebalancingAmount
        );
        ParityMath.sub(
            depositRebalancingBalancePerToken[_tokenId],
            _depositRebalancingAmount
        );
        ParityMath.sub(depositRebalancingBalance, _depositRebalancingAmount);
        uint256 _totalDepositRebalancingAmount = _depositRebalancingAmount
            .alpha +
            _depositRebalancingAmount.beta +
            _depositRebalancingAmount.gamma;
        uint256 _totalWithdrawalRebalancingAmount = (_withdrawalRebalancingAmount
                .alpha *
                _price[0] +
                _withdrawalRebalancingAmount.beta *
                _price[1] +
                _withdrawalRebalancingAmount.gamma *
                _price[2]) / ParityData.FACTOR_PRICE_DECIMALS;
        if (
            _totalDepositRebalancingAmount > _totalWithdrawalRebalancingAmount
        ) {
            uint256 _deltaAmount = _totalDepositRebalancingAmount -
                _totalWithdrawalRebalancingAmount;
            depositBalancePerToken[_tokenId].alpha += _deltaAmount;
            depositBalance.alpha += _deltaAmount;

            if (_indexDeposit < ParityLogic.MAX_INDEX_EVENT) {
                depositBalancePerTokenPerEvent[_tokenId][_indexDeposit]
                    .amount
                    .alpha += _deltaAmount;
            } else {
                depositBalancePerTokenPerEvent[_tokenId].push(
                    ParityData.Event(
                        ParityData.Amount(_deltaAmount, 0, 0),
                        _indexEvent
                    )
                );
            }
        }
    }

    function _calculateRebalancingData(
        uint256 _tokenId,
        uint256 _indexEvent,
        uint256 _newAmount,
        uint256 _totalValue,
        ParityData.Amount memory _oldValue,
        ParityData.Amount memory _depositBalance,
        ParityData.Amount memory _weights,
        uint256[3] memory _price
    ) internal {
        ParityData.Amount memory _depositToAdd;
        ParityData.Amount memory _depositToRemove;
        ParityData.Amount memory _depositRebalancing;
        ParityData.Amount memory _withdrawalRebalancing;
        (
            _depositToAdd,
            _depositToRemove,
            _depositRebalancing,
            _withdrawalRebalancing
        ) = ParityLogic.calculateRebalancingData(
            _newAmount,
            _totalValue,
            _oldValue,
            _depositBalance,
            _weights,
            _price
        );
        _updateRebalancingData(
            _tokenId,
            _indexEvent,
            _depositToAdd,
            _depositToRemove,
            _depositRebalancing,
            _withdrawalRebalancing
        );
    }

    function rebalanceParityPosition(
        ParityData.Position memory _position,
        uint256 _indexEvent,
        uint256[3] memory _price,
        bool _isFree
    ) external {
        require(msg.sender == investmentParity, "Formation.Fi: no Proxy");
        _rebalanceParityPosition(
            _position.tokenId,
            _position.userWeights,
            _position.amount,
            _indexEvent,
            _price,
            _isFree
        );
        optionPerToken[_position.tokenId] = _position.userOption;
        returnPerToken[_position.tokenId] = _position.userReturn;
        riskPerToken[_position.tokenId] = _position.userRisk;
        weightsPerToken[_position.tokenId] = _position.userWeights;
    }

    function submitRebalancingParityPositionRequest(
        ParityData.Position memory _position
    ) external {
        require(msg.sender == investmentParity, "Formation.Fi: no Proxy");
        require(
            !tokenIdsToRebalance[_position.tokenId],
            "rebalancing request exists"
        );
        tokenIdsToRebalance[_position.tokenId] = true;
        rebalancingRequests[_position.tokenId] = _position;
    }

    function _rebalanceParityPosition(
        uint256 _tokenId,
        ParityData.Amount memory _weights,
        uint256 _newAmount,
        uint256 _indexEvent,
        uint256[3] memory _price,
        bool _isFree
    ) internal {
        _cancelRebalancing(_tokenId, _indexEvent, _price);
        uint256 _totalValue;
        ParityData.Amount memory _oldValue;
        ParityData.Amount memory _depositBalance;
        uint256 _indexDeposit;
        (
            _oldValue.alpha,
            _oldValue.beta,
            _oldValue.gamma,
            _totalValue
        ) = _getTokenValueToRebalance(_tokenId, _indexEvent, _price);
        if ((!_isFree) && (_totalValue > 0)) {
            _deduceRebalancingFee(
                _tokenId,
                _indexEvent,
                _totalValue,
                _oldValue,
                _price
            );
            (
                _oldValue.alpha,
                _oldValue.beta,
                _oldValue.gamma,
                _totalValue
            ) = _getTokenValueToRebalance(_tokenId, _indexEvent, _price);
        }
        if ((_totalValue + _newAmount) > 0) {
            _indexDeposit = ParityLogic.searchIndexEvent(
                depositBalancePerTokenPerEvent[_tokenId],
                _indexEvent
            );
            if (_indexDeposit < ParityLogic.MAX_INDEX_EVENT) {
                _depositBalance = depositBalancePerTokenPerEvent[_tokenId][
                    _indexDeposit
                ].amount;
            }
            _calculateRebalancingData(
                _tokenId,
                _indexEvent,
                _newAmount,
                _totalValue,
                _oldValue,
                _depositBalance,
                _weights,
                _price
            );
        }
    }

    function _updateRebalancingData(
        uint256 _tokenId,
        uint256 _indexEvent,
        ParityData.Amount memory _depositToAdd,
        ParityData.Amount memory _depositToRemove,
        ParityData.Amount memory _depositRebalancing,
        ParityData.Amount memory _withdrawalRebalancing
    ) internal {
        uint256 _index;
        uint256 _size;
        _index = ParityLogic.searchIndexEvent(
            depositBalancePerTokenPerEvent[_tokenId],
            _indexEvent
        );
        if (_index < ParityLogic.MAX_INDEX_EVENT) {
            ParityMath.add(
                depositBalancePerTokenPerEvent[_tokenId][_index].amount,
                _depositToAdd
            );
            ParityMath.sub(
                depositBalancePerTokenPerEvent[_tokenId][_index].amount,
                _depositToRemove
            );
        } else {
            depositBalancePerTokenPerEvent[_tokenId].push(
                ParityData.Event(_depositToAdd, _indexEvent)
            );
            _size = depositBalancePerTokenPerEvent[_tokenId].length - 1;
            ParityMath.sub(
                depositBalancePerTokenPerEvent[_tokenId][_size].amount,
                _depositToRemove
            );
        }
        ParityMath.add(depositBalancePerToken[_tokenId], _depositToAdd);
        ParityMath.sub(depositBalancePerToken[_tokenId], _depositToRemove);
        ParityMath.add(depositBalance, _depositToAdd);
        ParityMath.sub(depositBalance, _depositToRemove);
        _index = ParityLogic.searchIndexEvent(
            depositRebalancingBalancePerTokenPerEvent[_tokenId],
            _indexEvent
        );
        if (_index < ParityLogic.MAX_INDEX_EVENT) {
            ParityMath.add(
                depositRebalancingBalancePerTokenPerEvent[_tokenId][_index]
                    .amount,
                _depositRebalancing
            );
        } else {
            depositRebalancingBalancePerTokenPerEvent[_tokenId].push(
                ParityData.Event(_depositRebalancing, _indexEvent)
            );
        }
        ParityMath.add(
            depositRebalancingBalancePerToken[_tokenId],
            _depositRebalancing
        );
        ParityMath.add(depositRebalancingBalance, _depositRebalancing);
        _index = ParityLogic.searchIndexEvent(
            withdrawalRebalancingBalancePerTokenPerEvent[_tokenId],
            _indexEvent
        );
        if (_index < ParityLogic.MAX_INDEX_EVENT) {
            ParityMath.add(
                withdrawalRebalancingBalancePerTokenPerEvent[_tokenId][_index]
                    .amount,
                _withdrawalRebalancing
            );
        } else {
            withdrawalRebalancingBalancePerTokenPerEvent[_tokenId].push(
                ParityData.Event(_withdrawalRebalancing, _indexEvent)
            );
        }
        ParityMath.add(
            withdrawalRebalancingBalancePerToken[_tokenId],
            _withdrawalRebalancing
        );
        ParityMath.add(withdrawalRebalancingBalance, _withdrawalRebalancing);
        ParityMath.sub(tokenBalancePerToken[_tokenId], _withdrawalRebalancing);
    }

    function cancelWithdrawalRequest(
        uint256 _tokenId,
        uint256 _indexEvent,
        uint256[3] memory _price
    ) external {
        require(msg.sender == investmentParity, "Formation.Fi: no proxy");
        (bool _isCancel, uint256 _index) = ParityLogic
            .isCancelWithdrawalRequest(
                withdrawalBalancePerTokenPerEvent[_tokenId],
                _indexEvent
            );
        require(_isCancel == true, "Formation.Fi: no cancel");
        _cancelRebalancing(_tokenId, _indexEvent, _price);
        ParityData.Amount memory _withdrawalFee;
        uint256 _indexWithdrawalFee = ParityLogic.searchIndexEvent(
            tokenWithdrawalFee[_tokenId],
            _indexEvent
        );
        if (_indexWithdrawalFee < ParityLogic.MAX_INDEX_EVENT) {
            _withdrawalFee = tokenWithdrawalFee[_tokenId][_indexWithdrawalFee]
                .amount;
            ParityStorageUpdate.deleteEventData(
                tokenWithdrawalFee[_tokenId],
                _indexWithdrawalFee
            );
        }
        ParityStorageUpdate.cancelWithdrawalRequest(
            withdrawalBalancePerTokenPerEvent[_tokenId][_index].amount,
            tokenBalancePerToken[_tokenId],
            withdrawalBalancePerToken[_tokenId],
            withdrawalBalance,
            _withdrawalFee
        );
        ParityStorageUpdate.deleteEventData(
            withdrawalBalancePerTokenPerEvent[_tokenId],
            _index
        );
        /*  _rebalanceParityPosition(
            _tokenId,
            weightsPerToken[_tokenId],
            0,
            _indexEvent,
            _price,
            true
        );
        */
        safeHouse.sendBackWithdrawalFee(_withdrawalFee);
    }

    function withdrawalRequest(
        uint256 _tokenId,
        uint256 _indexEvent,
        uint256 _rate,
        uint256[3] memory _price,
        address _owner
    ) external {
        require(msg.sender == investmentParity, "Formation.Fi: no proxy");
        _cancelRebalancing(_tokenId, _indexEvent, _price);
        ParityData.Amount memory _amountToWithdrawFromDeposit;
        ParityData.Amount memory _amountToWithdrawFromTokens;
        ParityData.Amount memory _withdrawalFees;
        uint256 _stableAmountToSend;
        uint256 _stableFee;
        (
            _amountToWithdrawFromDeposit,
            _amountToWithdrawFromTokens
        ) = _calculateWithdrawalData(
            _rate,
            _tokenId,
            _indexEvent,
            tokenBalancePerToken[_tokenId],
            _price
        );
        ParityData.Fee[]
            memory _withdrawalVariableFeeData = managementParityParams
                .getWithdrawalVariableFeeData();
        _withdrawalFees.alpha = ParityLogic.calculateWithdrawalFees(
            flowTimePerToken[_tokenId].alpha,
            _withdrawalVariableFeeData
        );
        _withdrawalFees.beta = ParityLogic.calculateWithdrawalFees(
            flowTimePerToken[_tokenId].beta,
            _withdrawalVariableFeeData
        );
        _withdrawalFees.gamma = ParityLogic.calculateWithdrawalFees(
            flowTimePerToken[_tokenId].gamma,
            _withdrawalVariableFeeData
        );
        _withdrawalFees = ParityLogic.getWithdrawalTokenFees(
            _withdrawalFees,
            _amountToWithdrawFromTokens,
            _price
        );
        _stableAmountToSend =
            _amountToWithdrawFromDeposit.alpha +
            _amountToWithdrawFromDeposit.beta +
            _amountToWithdrawFromDeposit.gamma;
        _stableFee = Math.mulDiv(
            _stableAmountToSend,
            managementParityParams.fixedWithdrawalFee(),
            ParityData.COEFF_SCALE_DECIMALS
        );
        _stableAmountToSend = _stableAmountToSend - _stableFee;
        uint256 _indexWithdrawalFee = ParityLogic.searchIndexEvent(
            tokenWithdrawalFee[_tokenId],
            _indexEvent
        );
        if (_indexWithdrawalFee < ParityLogic.MAX_INDEX_EVENT) {
            ParityMath.add(
                tokenWithdrawalFee[_tokenId][_indexWithdrawalFee].amount,
                _withdrawalFees
            );
        } else {
            tokenWithdrawalFee[_tokenId].push(
                ParityData.Event(_withdrawalFees, _indexEvent)
            );
        }
        _updateWithdrawalData(
            _tokenId,
            _indexEvent,
            _amountToWithdrawFromDeposit,
            _amountToWithdrawFromTokens,
            _withdrawalFees,
            _price
        );
        /* _rebalanceParityPosition(
            _tokenId,
            weightsPerToken[_tokenId],
            0,
            _indexEvent,
            _price,
            true
        );
    */
        safeHouse.sendTokenFee(_withdrawalFees);
        safeHouse.sendStableFee(_owner, _stableAmountToSend, _stableFee);
    }

    function _calculateWithdrawalData(
        uint256 _rate,
        uint256 _tokenId,
        uint256 _indexEvent,
        ParityData.Amount memory _tokenBalancePerToken,
        uint256[3] memory _price
    )
        internal
        view
        returns (
            ParityData.Amount memory _amountToWithdrawFromDeposit,
            ParityData.Amount memory _amountToWithdrawFromTokens
        )
    {
        uint256 _depositValueTotal;
        ParityData.Amount memory _depositValue;
        uint256 _indexDeposit = ParityLogic.searchIndexEvent(
            depositBalancePerTokenPerEvent[_tokenId],
            _indexEvent
        );
        if (_indexDeposit < ParityLogic.MAX_INDEX_EVENT) {
            _depositValueTotal =
                depositBalancePerTokenPerEvent[_tokenId][_indexDeposit]
                    .amount
                    .alpha +
                depositBalancePerTokenPerEvent[_tokenId][_indexDeposit]
                    .amount
                    .beta +
                depositBalancePerTokenPerEvent[_tokenId][_indexDeposit]
                    .amount
                    .gamma;
            _depositValue = depositBalancePerTokenPerEvent[_tokenId][
                _indexDeposit
            ].amount;
        }
        uint256 _totalValue = _getAvailableTokenValue(
            _tokenId,
            _indexEvent,
            _price
        );
        require(_totalValue > 0, "Formation.Fi : total value is zero");
        (
            _amountToWithdrawFromDeposit,
            _amountToWithdrawFromTokens
        ) = ParityLogic.calculateWithdrawalData(
            _rate,
            _totalValue,
            _depositValueTotal,
            _depositValue,
            _tokenBalancePerToken,
            _price
        );
    }

    function _updateWithdrawalData(
        uint256 _tokenId,
        uint256 _indexEvent,
        ParityData.Amount memory _amountToWithdrawFromDeposit,
        ParityData.Amount memory _amountToWithdrawFromTokens,
        ParityData.Amount memory _withdrawalFees,
        uint256[3] memory _price
    ) internal {
        uint256 _indexDeposit;
        uint256 _indexWithdrawal;
        _indexDeposit = ParityLogic.searchIndexEvent(
            depositBalancePerTokenPerEvent[_tokenId],
            _indexEvent
        );
        _indexWithdrawal = ParityLogic.searchIndexEvent(
            withdrawalBalancePerTokenPerEvent[_tokenId],
            _indexEvent
        );
        if (_indexDeposit < ParityLogic.MAX_INDEX_EVENT) {
            ParityMath.sub(
                depositBalancePerTokenPerEvent[_tokenId][_indexDeposit].amount,
                _amountToWithdrawFromDeposit
            );
        }
        ParityMath.sub(
            depositBalancePerToken[_tokenId],
            _amountToWithdrawFromDeposit
        );
        ParityMath.sub(depositBalance, _amountToWithdrawFromDeposit);
        uint256[3] memory _scaledPrice;
        uint256 _scale = ParityData.COEFF_SCALE_DECIMALS;
        _scaledPrice[0] = _price[0] * _scale;
        _scaledPrice[1] = _price[1] * _scale;
        _scaledPrice[2] = _price[2] * _scale;
        _amountToWithdrawFromTokens = ParityMath.mulDivMultiCoef2(
            _amountToWithdrawFromTokens,
            ParityData.FACTOR_PRICE_DECIMALS,
            _scaledPrice
        );
        ParityMath.sub(
            tokenBalancePerToken[_tokenId],
            _amountToWithdrawFromTokens
        );
        _amountToWithdrawFromTokens = ParityMath.sub2(
            _amountToWithdrawFromTokens,
            _withdrawalFees
        );
        if (_indexWithdrawal < ParityLogic.MAX_INDEX_EVENT) {
            ParityMath.add(
                withdrawalBalancePerTokenPerEvent[_tokenId][_indexWithdrawal]
                    .amount,
                _amountToWithdrawFromTokens
            );
        } else {
            withdrawalBalancePerTokenPerEvent[_tokenId].push(
                ParityData.Event(_amountToWithdrawFromTokens, _indexEvent)
            );
        }
        ParityMath.add(
            withdrawalBalancePerToken[_tokenId],
            _amountToWithdrawFromTokens
        );
        ParityMath.add(withdrawalBalance, _amountToWithdrawFromTokens);
    }

    function _updateDepositData(
        uint256 _tokenId,
        uint256 _indexEvent,
        ParityData.Amount memory _token
    ) internal {
        ParityStorageUpdate.updateDepositData(
            _indexEvent,
            depositBalancePerToken[_tokenId],
            depositBalance,
            _token,
            depositBalancePerTokenPerEvent[_tokenId]
        );
    }

    function _deduceRebalancingFee(
        uint256 _tokenId,
        uint256 _indexEvent,
        uint256 _totalValue,
        ParityData.Amount memory _oldValue,
        uint256[3] memory _price
    )
        internal
        returns (
            ParityData.Amount memory _feeFromDeposit,
            ParityData.Amount memory _feeFromToken
        )
    {
        ParityData.Amount memory _fee;
        uint256 _rebalancingFee = managementParityParams.getRebalancingFee(
            _totalValue
        );
        _fee = ParityMath.mulDiv2(_oldValue, _rebalancingFee, _totalValue);
        (_feeFromDeposit, _feeFromToken) = ParityStorageUpdate
            .deduceRebalancingFee(
                _indexEvent,
                _fee,
                depositBalancePerTokenPerEvent[_tokenId],
                depositBalancePerToken[_tokenId],
                tokenBalancePerToken[_tokenId],
                _price
            );
        ParityMath.sub(depositBalance, _feeFromDeposit);
        safeHouse.sendTokenFee(_feeFromToken);
        safeHouse.sendStableFee(
            msg.sender,
            0,
            _feeFromDeposit.alpha + _feeFromDeposit.beta + _feeFromDeposit.gamma
        );
    }

    function updateUserPreference(
        ParityData.Position memory _position,
        uint256 _indexEvent,
        //uint256[3] memory _price,
        bool _isFirst
    ) public {
        require(msg.sender == tokenParity, "Formation.Fi: no Proxy");
        if (_isFirst) {
            optionPerToken[_position.tokenId] = _position.userOption;
            riskPerToken[_position.tokenId] = _position.userRisk;
            returnPerToken[_position.tokenId] = _position.userReturn;
            weightsPerToken[_position.tokenId].alpha = _position
                .userWeights
                .alpha;
            weightsPerToken[_position.tokenId].beta = _position
                .userWeights
                .beta;
            weightsPerToken[_position.tokenId].gamma = _position
                .userWeights
                .gamma;
            ParityData.Amount memory _token;
            _token.alpha = Math.mulDiv(
                _position.amount,
                _position.userWeights.alpha,
                ParityData.COEFF_SCALE_DECIMALS
            );
            _token.beta = Math.mulDiv(
                _position.amount,
                _position.userWeights.beta,
                ParityData.COEFF_SCALE_DECIMALS
            );
            _token.gamma = _position.amount - (_token.alpha + _token.beta);
            _updateDepositData(_position.tokenId, _indexEvent, _token);
        } else {
            if (optionPerToken[_position.tokenId] == 1) {
                require(
                    (riskPerToken[_position.tokenId] == _position.userRisk),
                    "Formation.Fi: no user's risk"
                );
            } else if (optionPerToken[_position.tokenId] == 2) {
                require(
                    (returnPerToken[_position.tokenId] == _position.userReturn),
                    "Formation.Fi: no user's return"
                );
            } else if (optionPerToken[_position.tokenId] == 3) {
                require(
                    (weightsPerToken[_position.tokenId].alpha ==
                        _position.userWeights.alpha) &&
                        (weightsPerToken[_position.tokenId].beta ==
                            _position.userWeights.beta) &&
                        (weightsPerToken[_position.tokenId].gamma ==
                            _position.userWeights.gamma),
                    "Formation.Fi: no user's weights"
                );
            }
            //  _rebalanceParityPosition(
            //     _position.tokenId,
            //    _position.userWeights,
            //    _position.amount,
            //    _indexEvent,
            //    _price,
            //   true
            // );
        }
    }
}
