// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "./ParityLogic.sol";
library ParityStorageUpdate {
    uint256 public constant TOLERANCE = 1e3;
    function updateEventData(ParityData.Event[] storage _data, uint256 _amount, 
        uint256 _indexEvent, uint256 _id) internal {  
        uint256 _size = _data.length; 
        uint256 _availableAmount = ParityLogic.getTotalValueUntilLastEventPerProduct(_data, _indexEvent, _id);
        if (_availableAmount > 0){
            require (_availableAmount >= _amount, "Formation.Fi: no available amount");
            uint256 _localAmount;
            uint256 k = 0;
            ParityData.Event memory _event;
            for (uint256 i = 0; i < _size ; i++){
                _event = _data[k];
                if (_event.index < _indexEvent){
                    if (_id == 0){
                        _localAmount = Math.min(_amount, _event.amount.alpha);
                        _data[k].amount.alpha -= _localAmount;
                    }
                    else if (_id == 1){
                        _localAmount = Math.min(_amount, _event.amount.beta);
                        _data[k].amount.beta -= _localAmount;
                    }
                    else {
                        _localAmount = Math.min(_amount, _event.amount.gamma);
                        _data[k].amount.gamma -= _localAmount;
                    }
                    _amount -= _localAmount;
                    if ((_data[k].amount.alpha <= TOLERANCE) && 
                        (_data[k].amount.beta <= TOLERANCE) && 
                        (_data[k].amount.gamma <= TOLERANCE)){
                        deleteEventData (_data, k);
                    }
                    else {
                        k = k+1;
                    }
                    if (_amount == 0){
                        break;
                    }    
                }
            }
        }
    }

    function deleteEventData(ParityData.Event[] storage _data, uint256 _index) 
        internal {
        require( _index <= _data.length - 1,
            "Formation.Fi: out of range");
        for (uint256 i = _index; i< _data.length; i++){
            if ( i+1 <= _data.length - 1){
                _data[i] = _data[i+1];
            }
        }
        _data.pop();   
    }

    function updateDepositData(uint256 _indexEvent, 
        ParityData.Amount storage _depositBalancePerToken,
        ParityData.Amount storage _depositBalance,
        ParityData.Amount memory _token,
        ParityData.Event[] storage  _depositBalancePerTokenPerEvent)
        internal {
        ParityMath.add(_depositBalancePerToken, _token);
        ParityMath.add(_depositBalance, _token);
        _depositBalancePerTokenPerEvent.push(ParityData.Event(_token, _indexEvent));
    }

    function updateDataBalancePerToken(ParityData.Amount storage _dataBalancePerToken, 
        ParityData.Event[] storage _dataBalancePerTokenPerEvent, uint256 _amount, 
        uint256 _indexEvent, uint256 _id) internal {
        require( _id >= 0 && _id <= 2, 
        "Formation.Fi: not in range");  
        if (_id==0){
            _dataBalancePerToken.alpha -= _amount;
            if (_dataBalancePerToken.alpha <TOLERANCE){ 
                _dataBalancePerToken.alpha = 0;
            }
        }
        else if (_id==1) {
            _dataBalancePerToken.beta -= _amount;
            if (_dataBalancePerToken.beta <TOLERANCE){ 
                _dataBalancePerToken.beta = 0;
            }
        }
        else{
            _dataBalancePerToken.gamma -= _amount;
            if (_dataBalancePerToken.gamma <TOLERANCE){ 
                _dataBalancePerToken.gamma = 0;
            }
        }
        updateEventData(_dataBalancePerTokenPerEvent, _amount, 
        _indexEvent, _id);
    }   

    function updateTotalBalances(ParityData.Amount storage _depositBalance,
        ParityData.Amount storage _withdrawalBalance, 
        ParityData.Amount storage _depositRebalancingBalance,
        ParityData.Amount storage _withdrawalRebalancingBalance, 
        ParityData.Amount memory _depositAmount, 
        ParityData.Amount memory _withdrawalAmount, 
        ParityData.Amount memory _depositRebalancingAmount, 
        ParityData.Amount memory _withdrawalRebalancingAmount) 
        internal {
        ParityMath.sub( _depositBalance, _depositAmount);
        ParityMath.sub( _withdrawalBalance, _withdrawalAmount);
        ParityMath.sub( _depositRebalancingBalance, _depositRebalancingAmount);
        ParityMath.sub( _withdrawalRebalancingBalance, _withdrawalRebalancingAmount);
    }  

    function updateTokenBalancePerToken(ParityData.Amount storage _tokenBalancePerToken, 
        ParityData.Amount storage _flowTimePerToken, uint256 _amount, uint256 _id) 
        internal  {
        if (_id==0){
            _flowTimePerToken.alpha = ParityLogic.updateTokenFlowTime(_flowTimePerToken.alpha,  
            _tokenBalancePerToken.alpha, _amount); 
            _tokenBalancePerToken.alpha += _amount;   
        }     
        else if ( _id==1) {
            _flowTimePerToken.beta = ParityLogic.updateTokenFlowTime(_flowTimePerToken.beta,  
            _tokenBalancePerToken.beta, _amount); 
            _tokenBalancePerToken.beta += _amount;
        }
        else {
            _flowTimePerToken.gamma = ParityLogic.updateTokenFlowTime(_flowTimePerToken.gamma,  
            _tokenBalancePerToken.gamma, _amount); 
            _tokenBalancePerToken.gamma += _amount;
        }  
    } 

    function deduceRebalancingFee(uint256 _indexEvent, ParityData.Amount memory _fee, ParityData.Event[] storage _depositBalancePerTokenPerEvent, 
        ParityData.Amount storage _depositBalancePerToken, ParityData.Amount storage _tokenBalancePerToken, uint256[3] memory _price) 
        internal returns (ParityData.Amount memory _feeFromDeposit, 
        ParityData.Amount memory  _feeFromToken) {
        uint256 _indexDeposit = ParityLogic.searchIndexEvent(_depositBalancePerTokenPerEvent, _indexEvent);
        if (_indexDeposit < ParityLogic.MAX_INDEX_EVENT){
            _feeFromDeposit.alpha = Math.min(_depositBalancePerTokenPerEvent[_indexDeposit].amount.alpha, _fee.alpha);
            _feeFromDeposit.beta = Math.min(_depositBalancePerTokenPerEvent[_indexDeposit].amount.beta, _fee.beta);
            _feeFromDeposit.gamma = Math.min(_depositBalancePerTokenPerEvent[_indexDeposit].amount.gamma, _fee.gamma);
            _fee = ParityMath.sub2(_fee, _feeFromDeposit);
            ParityMath.sub(_depositBalancePerTokenPerEvent[_indexDeposit].amount, _feeFromDeposit);
            ParityMath.sub(_depositBalancePerToken, _feeFromDeposit);
            if (( _depositBalancePerTokenPerEvent[_indexDeposit].amount.alpha == 0 ) &&
                (_depositBalancePerTokenPerEvent[_indexDeposit].amount.beta == 0) &&
                (_depositBalancePerTokenPerEvent[_indexDeposit].amount.gamma == 0)){
                deleteEventData(_depositBalancePerTokenPerEvent, _indexDeposit);
            }
        }   
        _feeFromToken = ParityMath.mulDivMultiCoef2(_fee, ParityData.FACTOR_PRICE_DECIMALS, _price);
        ParityMath.sub(_tokenBalancePerToken, _feeFromToken);      
    }

    function cancelWithdrawalRequest (ParityData.Amount storage _withdrawalBalancePerTokenPerEvent, 
        ParityData.Amount storage _tokenBalancePerToken,  ParityData.Amount storage _withdrawalBalance, ParityData.Amount storage _withdrawalBalancePerToken, 
        ParityData.Amount memory _withdrawalFee) internal {
        ParityMath.add( _tokenBalancePerToken, _withdrawalBalancePerTokenPerEvent);
        ParityMath.add( _tokenBalancePerToken, _withdrawalFee);
        ParityMath.sub( _withdrawalBalancePerToken, _withdrawalBalancePerTokenPerEvent);
        ParityMath.sub( _withdrawalBalance, _withdrawalBalancePerTokenPerEvent);       
    }
           
}
