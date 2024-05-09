// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "@openzeppelin/contracts/access/Ownable.sol";
import "./libraries/ParityStorageUpdate.sol";
import "./IManagementParity.sol";
import "./ISafeHouse.sol";
import "./IManagementParityParams.sol";

/**
 * @author Every.finance.
 * @notice Implementation of the contract TokenParityStorage.
 */

contract TokenParityStorage is Ownable {
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
    mapping(uint256 => ParityData.Position) private rebalancingRequests;
    ISafeHouse public safeHouse;
    IManagementParityParams public managementParityParams;
    address public delegateContract;

    constructor(address _delegateContract) {
        require(_delegateContract != address(0), "Every.finance: zero address");
        uint256 _size;
        assembly {
            _size := extcodesize(_delegateContract)
        }
        require(_size > 0, "Every.finance: no contract");
        delegateContract = _delegateContract;
    }

    modifier onlyManagementParity() {
        require(managementParity != address(0), "Every.finance: zero address");
        require(
            msg.sender == managementParity,
            "Every.finance: no ManagementParity"
        );
        _;
    }

    function setTokenParity(address _tokenParity) public onlyOwner {
        require(_tokenParity != address(0), "Every.finance: zero address");
        tokenParity = _tokenParity;
    }

    function setInvestmentParity(address _investmentParity) public onlyOwner {
        require(_investmentParity != address(0), "Every.finance: zero address");
        investmentParity = _investmentParity;
    }

    function setSafeHouse(address _safeHouse) public onlyOwner {
        require(_safeHouse != address(0), "Every.finance: zero address");
        safeHouse = ISafeHouse(_safeHouse);
    }

    function setmanagementParity(
        address _managementParity,
        address _managementParityParams
    ) public onlyOwner {
        require(_managementParity != address(0), "Every.finance: zero address");
        require(
            _managementParityParams != address(0),
            "Every.finance: zero address"
        );
        managementParity = _managementParity;
        managementParityParams = IManagementParityParams(
            _managementParityParams
        );
    }

    function setDelegateContract(address _delegateContract) external onlyOwner {
        require(_delegateContract != address(0), "Every.finance: zero address");
        uint256 _size;
        assembly {
            _size := extcodesize(_delegateContract)
        }
        require(_size > 0, "Every.finance: no contract");
        delegateContract = _delegateContract;
    }

    function updateTokenBalancePerToken(
        uint256 _tokenId,
        uint256 _amount,
        uint256 _id
    ) external {
        (bool success, ) = delegateContract.delegatecall(
            abi.encodeWithSignature(
                "updateTokenBalancePerToken(uint256,uint256,uint256)",
                _tokenId,
                _amount,
                _id
            )
        );
        require(success == true, "Every.finance: delegatecall fails");
    }

    function updateDepositBalancePerToken(
        uint256 _tokenId,
        uint256 _amount,
        uint256 _indexEvent,
        uint256 _id
    ) external {
        (bool success, ) = delegateContract.delegatecall(
            abi.encodeWithSignature(
                "updateDepositBalancePerToken(uint256,uint256,uint256,uint256)",
                _tokenId,
                _amount,
                _indexEvent,
                _id
            )
        );
        require(success == true, "Every.finance: delegatecall fails");
    }

    function updateRebalancingDepositBalancePerToken(
        uint256 _tokenId,
        uint256 _amount,
        uint256 _indexEvent,
        uint256 _id
    ) external {
        (bool success, ) = delegateContract.delegatecall(
            abi.encodeWithSignature(
                "updateRebalancingDepositBalancePerToken(uint256,uint256,uint256,uint256)",
                _tokenId,
                _amount,
                _indexEvent,
                _id
            )
        );
        require(success == true, "Every.finance: delegatecall fails");
    }

    function updateRebalancingWithdrawalBalancePerToken(
        uint256 _tokenId,
        uint256 _amount,
        uint256 _indexEvent,
        uint256 _id
    ) external {
        (bool success, ) = delegateContract.delegatecall(
            abi.encodeWithSignature(
                "updateRebalancingWithdrawalBalancePerToken(uint256,uint256,uint256,uint256)",
                _tokenId,
                _amount,
                _indexEvent,
                _id
            )
        );
        require(success == true, "Every.finance: delegatecall fails");
    }

    function updateWithdrawalBalancePerToken(
        uint256 _tokenId,
        uint256 _amount,
        uint256 _indexEvent,
        uint256 _id
    ) external {
        (bool success, ) = delegateContract.delegatecall(
            abi.encodeWithSignature(
                "updateWithdrawalBalancePerToken(uint256,uint256,uint256,uint256)",
                _tokenId,
                _amount,
                _indexEvent,
                _id
            )
        );
        require(success == true, "Every.finance: delegatecall fails");
    }

    function updateTotalBalances(
        ParityData.Amount memory _depositAmount,
        ParityData.Amount memory _withdrawalAmount,
        ParityData.Amount memory _depositRebalancingAmount,
        ParityData.Amount memory _withdrawalRebalancingAmount
    ) external {
        (bool success, ) = delegateContract.delegatecall(
            abi.encodeWithSignature(
                "updateTotalBalances((uint256,uint256,uint256),(uint256,uint256,uint256),(uint256,uint256,uint256),(uint256,uint256,uint256))",
                _depositAmount,
                _withdrawalAmount,
                _depositRebalancingAmount,
                _withdrawalRebalancingAmount
            )
        );
        require(success == true, "Every.finance: delegatecall fails");
    }

    function rebalanceParityPosition(
        ParityData.Position memory _position,
        uint256 _indexEvent,
        uint256[3] memory _price,
        bool _isFree
    ) external {
        (bool success, ) = delegateContract.delegatecall(
            abi.encodeWithSignature(
                "rebalanceParityPosition((uint256,uint256,uint256,uint256,uint256,(uint256,uint256,uint256)),uint256,uint256[3],bool)",
                _position,
                _indexEvent,
                _price,
                _isFree
            )
        );
        require(success == true, "Every.finance: delegatecall fails");
    }

    function submitRebalancingParityPositionRequest(
        ParityData.Position memory _position
    ) external {
        (bool success, ) = delegateContract.delegatecall(
            abi.encodeWithSignature(
                "submitRebalancingParityPositionRequest((uint256,uint256,uint256,uint256,uint256,(uint256,uint256,uint256)))",
                _position
            )
        );
        require(success == true, "Every.finance: delegatecall fails");
    }

    function cancelWithdrawalRequest(
        uint256 _tokenId,
        uint256 _indexEvent,
        uint256[3] memory _price
    ) external {
        (bool success, ) = delegateContract.delegatecall(
            abi.encodeWithSignature(
                "cancelWithdrawalRequest(uint256,uint256,uint256[3])",
                _tokenId,
                _indexEvent,
                _price
            )
        );
        require(success == true, "Every.finance: delegatecall fails");
    }

    function withdrawalRequest(
        uint256 _tokenId,
        uint256 _indexEvent,
        uint256 _rate,
        uint256[3] memory _price,
        address _owner
    ) external {
        (bool success, ) = delegateContract.delegatecall(
            abi.encodeWithSignature(
                "withdrawalRequest(uint256,uint256,uint256,uint256[3],address)",
                _tokenId,
                _indexEvent,
                _rate,
                _price,
                _owner
            )
        );
        require(success == true, "Every.finance: delegatecall fails");
    }

    function updateUserPreference(
        ParityData.Position memory _position,
        uint256 _indexEvent,
        uint256[3] memory _price,
        bool _isFirst
    ) external {
        (bool success, ) = delegateContract.delegatecall(
            abi.encodeWithSignature(
                "updateUserPreference((uint256,uint256,uint256,uint256,uint256,(uint256,uint256,uint256)),uint256,uint256[3],bool)",
                _position,
                _indexEvent,
                _price,
                _isFirst
            )
        );
        require(success == true, "Every.finance: delegatecall fails");
    }

    function getDepositBalancePerTokenPerEvent(
        uint256 _tokenId
    ) public view returns (ParityData.Event[] memory) {
        uint256 _size = depositBalancePerTokenPerEvent[_tokenId].length;
        ParityData.Event[] memory _data = new ParityData.Event[](_size);
        for (uint256 i = 0; i < _size; ++i) {
            _data[i] = depositBalancePerTokenPerEvent[_tokenId][i];
        }
        return _data;
    }

    function getDepositRebalancingBalancePerTokenPerEvent(
        uint256 _tokenId
    ) public view returns (ParityData.Event[] memory) {
        uint256 _size = depositRebalancingBalancePerTokenPerEvent[_tokenId]
            .length;
        ParityData.Event[] memory _data = new ParityData.Event[](_size);
        for (uint256 i = 0; i < _size; ++i) {
            _data[i] = depositRebalancingBalancePerTokenPerEvent[_tokenId][i];
        }
        return _data;
    }

    function getWithdrawalBalancePerTokenPerEvent(
        uint256 _tokenId
    ) public view returns (ParityData.Event[] memory) {
        uint256 _size = withdrawalBalancePerTokenPerEvent[_tokenId].length;
        ParityData.Event[] memory _data = new ParityData.Event[](_size);
        for (uint256 i = 0; i < _size; ++i) {
            _data[i] = withdrawalBalancePerTokenPerEvent[_tokenId][i];
        }
        return _data;
    }

    function getWithdrawalRebalancingBalancePerTokenPerEvent(
        uint256 _tokenId
    ) public view returns (ParityData.Event[] memory) {
        uint256 _size = withdrawalRebalancingBalancePerTokenPerEvent[_tokenId]
            .length;
        ParityData.Event[] memory _data = new ParityData.Event[](_size);
        for (uint256 i = 0; i < _size; ++i) {
            _data[i] = withdrawalRebalancingBalancePerTokenPerEvent[_tokenId][
                i
            ];
        }
        return _data;
    }

    function getRebalancingRequest(
        uint256 _tokenId
    ) public view returns (ParityData.Position memory) {
        return rebalancingRequests[_tokenId];
    }
}
