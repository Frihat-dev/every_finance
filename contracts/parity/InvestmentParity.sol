// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./TokenParity.sol";
import "./TokenParityView.sol";
import "./ParityLine.sol";
import "./IStakingParity.sol";

/**
 * @author Every.finance.
 * @notice Implementation of the contract InvestmentParity.
 */

contract InvestmentParity is AccessControlEnumerable, Pausable {
    using SafeERC20 for IERC20;
    using Math for uint256;
    bytes32 public constant MANAGER = keccak256("MANAGER");

    struct Risk {
        uint256 low;
        uint256 medium;
        uint256 high;
    }
    uint256 public tokenId;
    Risk public risk;
    address public managementParity;
    address public parityLine;

    event DepositRequest(ParityData.Position _position);
    event WithdrawalRequest(uint256 _tokenId, uint256 _rate);
    event CancelWithdrawalRequest(uint256 _tokenId);
    event SubmitRebalancingRequest(ParityData.Position _position);
    event ValidateRebalancingRequest(ParityData.Position _position);
    event RebalancingManagerRequest(ParityData.Position _position);
    event SetDefaultRisk(uint256 _low, uint256 _medium, uint256 _high);
   

    constructor(
        address _admin,
        address _manager,
        address _managementParity,
        address _parityLine
    ) {
        require(_admin != address(0), "Every.finance: zero address");
        require(_manager != address(0), "Every.finance: zero address");
        require(_managementParity != address(0), "Every.finance: zero address");
        require(_parityLine != address(0), "Every.finance: zero address");

        managementParity = _managementParity;
        parityLine = _parityLine;
        _setupRole(DEFAULT_ADMIN_ROLE, _admin);
        _setupRole(MANAGER, _manager);
    }

    function setManagementParity(
        address _managementParity
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_managementParity != address(0), "Every.finance: zero address");
        managementParity = _managementParity;
    }

    function setParityLine(
        address _parityLine
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_parityLine != address(0), "Every.finance: zero address");
        parityLine = _parityLine;
    }

    function setDefaultRisk(
        uint256 _low,
        uint256 _medium,
        uint256 _high
    ) external onlyRole(MANAGER) {
        risk = Risk(_low, _medium, _high);
        emit SetDefaultRisk(_low, _medium, _high);
    }

    function depositRequestWithLowRisk(
        address _account,
        uint256 _amount,
        uint256 _tokenId
    ) external whenNotPaused {
        ParityData.Position memory _position = ParityData.Position(
            _tokenId,
            _amount,
            1,
            risk.low,
            0,
            ParityData.Amount(0, 0, 0)
        );
        depositRequest(_account, _position);
    }

    function depositRequestWithMediumRisk(
        address _account,
        uint256 _amount,
        uint256 _tokenId
    ) external whenNotPaused {
        ParityData.Position memory _position = ParityData.Position(
            _tokenId,
            _amount,
            1,
            risk.medium,
            0,
            ParityData.Amount(0, 0, 0)
        );
        depositRequest(_account, _position);
    }

    function depositRequestWithHighRisk(
        address _account,
        uint256 _amount,
        uint256 _tokenId
    ) external whenNotPaused {
        ParityData.Position memory _position = ParityData.Position(
            _tokenId,
            _amount,
            1,
            risk.high,
            0,
            ParityData.Amount(0, 0, 0)
        );
        depositRequest(_account, _position);
    }

    function depositRequest(
        address _account,
        ParityData.Position memory _position
    ) public whenNotPaused {
        require(
            (_position.userOption >= 1) && (_position.userOption <= 3),
            "Every.finance: option is out of range"
        );
        require(
            _position.amount >= getMinAmountDeposit(),
            "Every.finance: min amount"
        );
        if (_position.userOption == 1) {
            (
                _position.userReturn,
                _position.userWeights.alpha,
                _position.userWeights.beta,
                _position.userWeights.gamma
            ) = ParityLine(parityLine).ConvertRisk(_position.userRisk);
        } else if (_position.userOption == 2) {
            (
                _position.userRisk,
                _position.userWeights.alpha,
                _position.userWeights.beta,
                _position.userWeights.gamma
            ) = ParityLine(parityLine).ConvertReturn(_position.userReturn);
        } else {
            require(
                (_position.userWeights.alpha +
                    _position.userWeights.beta +
                    _position.userWeights.gamma) ==
                    ParityData.COEFF_SCALE_DECIMALS,
                "Every.finance: sum weights"
            );
            (_position.userRisk, _position.userReturn) = ParityLine(parityLine)
                .ConvertWeights(
                    _position.userWeights.alpha,
                    _position.userWeights.beta,
                    _position.userWeights.gamma
                );
        }
        //uint256[3] memory _price = IManagementParity(managementParity)
          //  .getPrice();
        uint256 _indexEvent = IManagementParity(managementParity).indexEvent();
        bool _isStakingParity = IManagementParity(managementParity).isStakingParity();
        address _stakingParity = IManagementParity(managementParity).stakingParity();
        _position.amount = _sendFees(_position.amount, msg.sender);
        bool _isFirst;
        address _tokenParity = IManagementParity(managementParity)
            .tokenParity();
        if (_position.tokenId == 0) {
            tokenId = tokenId + 1;
            _position.tokenId = tokenId;
            _isFirst = true;
        } else {
            if (!_isStakingParity) {
                require(
                        (TokenParity(_tokenParity).ownerOf(_position.tokenId) ==
                            msg.sender),
                    "no owner"
                );
            } else {
                require(
                        ((TokenParity(_tokenParity).ownerOf(
                            _position.tokenId
                        ) == msg.sender) ||
                            (IStakingParity(_stakingParity).holders(
                                _position.tokenId
                            ) == msg.sender)),
                    "no owner"
                );
            }
        }
        TokenParity(_tokenParity).mint(
            _account,
            _position,
            _indexEvent,
            _isFirst
        );
        (
            address _stableToken,
            uint256 _amountScaleDecimals
        ) = IManagementParity(managementParity).getStableToken();
        if (_position.amount > 0) {
            IERC20(_stableToken).safeTransferFrom(
                msg.sender,
                IManagementParity(managementParity).safeHouse(),
                _position.amount / _amountScaleDecimals
            );
        }
        emit DepositRequest(_position);
    }

    function withdrawRequest(
        uint256 _tokenId,
        uint256 _rate
    ) external whenNotPaused {
        require(
            msg.sender ==
                TokenParity(IManagementParity(managementParity).tokenParity())
                    .ownerOf(_tokenId),
            "Every.finance: no owner"
        );
        require(
            (_rate > 0) && (_rate <= ParityData.COEFF_SCALE_DECIMALS),
            "Every.finance: not in range"
        );
        uint256 _indexEvent = IManagementParity(managementParity).indexEvent();
        uint256[3] memory _price = IManagementParity(managementParity)
            .getPrice();
        TokenParityStorage(
            IManagementParity(managementParity).tokenParityStorage()
        ).withdrawalRequest(_tokenId, _indexEvent, _rate, _price, msg.sender);
        emit WithdrawalRequest(_tokenId, _rate);
    }

    function cancelWithdrawRequest(uint256 _tokenId) external whenNotPaused {
        
        bool _isStakingParity = IManagementParity(managementParity).isStakingParity();
        address _stakingParity = IManagementParity(managementParity).stakingParity();
        address _tokenParity = IManagementParity(managementParity)
            .tokenParity();
        if (!_isStakingParity) {
                require(
                        (TokenParity(_tokenParity).ownerOf(_tokenId) ==
                            msg.sender),
                    "no owner"
                );
        } else {
                require(
                        ((TokenParity(_tokenParity).ownerOf(
                            _tokenId
                        ) == msg.sender) ||
                            (IStakingParity(_stakingParity).holders(
                                _tokenId
                            ) == msg.sender)),
                    "no owner"
                );
                IStakingParity(_stakingParity)._updateReward();
                if (IStakingParity(_stakingParity).holders(
                                _tokenId
                            ) == msg.sender){
                    IStakingParity(_stakingParity)._updateReward(_tokenId);
                }
        }

        uint256 _indexEvent = IManagementParity(managementParity).indexEvent();
       // uint256[3] memory _price = IManagementParity(managementParity)
       //     .getPrice();
        TokenParityStorage(
            IManagementParity(managementParity).tokenParityStorage()
        ).cancelWithdrawalRequest(_tokenId, _indexEvent);
        emit CancelWithdrawalRequest(_tokenId);
    }

    function rebalanceRequest(
        ParityData.Position memory _position
    ) external whenNotPaused {
        address _tokenParity = IManagementParity(managementParity)
            .tokenParity();

        bool _isStakingParity = IManagementParity(managementParity).isStakingParity();
        address _stakingParity = IManagementParity(managementParity).stakingParity();

        if (!_isStakingParity) {
            require(
                (TokenParity(_tokenParity).ownerOf(_position.tokenId) ==
                    msg.sender),
                "no owner"
            );
        } else {
            require(
                (TokenParity(_tokenParity).ownerOf(_position.tokenId) ==
                    msg.sender) ||
                    (IStakingParity(_stakingParity).holders(_position.tokenId) ==
                        msg.sender),
                "no owner"
            );
        }
        _position.amount = _sendFees(_position.amount, msg.sender);
        (
            address _stableToken,
            uint256 _amountScaleDecimals
        ) = IManagementParity(managementParity).getStableToken();
        if (_position.amount > 0) {
            IERC20(_stableToken).safeTransferFrom(
                msg.sender,
                IManagementParity(managementParity).safeHouse(),
                _position.amount / _amountScaleDecimals
            );
        }
        _rebalanceRequest(_position, false, 1);
    }

    function rebalanceManagerRequest(
        uint256[] memory _tokenIds
    ) external onlyRole(MANAGER) {
        ParityData.Amount memory _weights;
        ParityData.Position memory _position;
       bool _isStakingParity = IManagementParity(managementParity).isStakingParity();
       address _stakingParity = IManagementParity(managementParity).stakingParity();
        if (_isStakingParity){
            IStakingParity(_stakingParity)._updateReward();
        }
        address _tokenParity = IManagementParity(managementParity).tokenParity();
        address _tokenParityStorage =  IManagementParity(managementParity).tokenParityStorage();
        for (uint256 i = 0; i < _tokenIds.length; ++i) {
            if (
                TokenParity(_tokenParity)
                    .ownerOf(_tokenIds[i]) == address(0)
            ) {
                break;
            }
            if ((_isStakingParity) && (TokenParity(_tokenParity)
                    .ownerOf(_tokenIds[i]) == _stakingParity)){
                IStakingParity(_stakingParity)._updateReward(_tokenIds[i]);
            }
            _position.tokenId = _tokenIds[i];
            _position.amount = 0;
            (
                _weights.alpha,
                _weights.beta,
                _weights.gamma
            ) = TokenParityStorage(
                _tokenParityStorage
            ).weightsPerToken(_tokenIds[i]);
            _position.userWeights = _weights;
            _position.userOption = TokenParityStorage(
                _tokenParityStorage
            ).optionPerToken(_tokenIds[i]);
            _position.userRisk = TokenParityStorage(
                _tokenParityStorage
            ).riskPerToken(_tokenIds[i]);
            _position.userReturn = TokenParityStorage(
                _tokenParityStorage
            ).returnPerToken(_tokenIds[i]);
            _rebalanceRequest(_position, true, 3);
        }
    }

    function validateRebalancingRequest(
        uint256[] memory _tokenIds
    ) external onlyRole(MANAGER) {
        // ParityData.Amount memory _weights;
        ParityData.Position memory _position;
        address _tokenParityStorage = IManagementParity(managementParity)
            .tokenParityStorage();
        address _tokenParity = IManagementParity(managementParity).tokenParity();
        bool _isStakingParity = IManagementParity(managementParity).isStakingParity();
        address _stakingParity = IManagementParity(managementParity).stakingParity();
        if (_isStakingParity){
            IStakingParity(_stakingParity)._updateReward();
        }   
        for (uint256 i = 0; i < _tokenIds.length; ++i) {
            if (
                TokenParity(_tokenParity)
                    .ownerOf(_tokenIds[i]) == address(0)
            ) {
                break;
            }
            require(
                TokenParityStorage(_tokenParityStorage).tokenIdsToRebalance(
                    _tokenIds[i]
                ),
                "no Rebalancing Request"
            );
            if ((_isStakingParity) && (TokenParity(_tokenParity).ownerOf(_tokenIds[i]) == _stakingParity)){
                IStakingParity(_stakingParity)._updateReward(_tokenIds[i]);
            }
            _position = TokenParityStorage(_tokenParityStorage)
                .getRebalancingRequest(_tokenIds[i]);
            _rebalanceRequest(_position, false, 2);
        }
    }

    function CloseParityPosition(uint256 _tokenId) external {
        address _owner = TokenParity(
            IManagementParity(managementParity).tokenParity()
        ).ownerOf(_tokenId);
        require(
            (msg.sender == _owner) || hasRole(MANAGER, msg.sender),
            "Every.finance: neither owner nor manager"
        );
        TokenParity(IManagementParity(managementParity).tokenParity()).burn(
            _tokenId
        );
    }

    function getTotalTokenValue(
        uint256 _tokenId
    ) public view returns (uint256 _value) {
        uint256[3] memory _price = IManagementParity(managementParity)
            .getPrice();
        _value = TokenParityView(
            IManagementParity(managementParity).tokenParityView()
        ).getTotalTokenValue(_tokenId, _price);
    }

    function getTotalNetTokenValue(
        uint256 _tokenId
    ) public view returns (uint256 _value) {
        uint256[3] memory _price = IManagementParity(managementParity)
            .getPrice();
        _value = TokenParityView(
            IManagementParity(managementParity).tokenParityView()
        ).getTotalNetTokenValue(_tokenId, _price);
    }

    function getAvailableTokenValue(
        uint256 _tokenId
    ) public view returns (uint256 _value) {
        uint256 _indexEvent = IManagementParity(managementParity).indexEvent();
        uint256[3] memory _price = IManagementParity(managementParity)
            .getPrice();
        _value = TokenParityView(
            IManagementParity(managementParity).tokenParityView()
        ).getAvailableTokenValue(_tokenId, _indexEvent, _price);
    }

    function getRebalancingFee(
        uint256 _tokenId
    ) public view returns (uint256 _fee) {
        uint256 _indexEvent = IManagementParity(managementParity).indexEvent();
        uint256[3] memory _price = IManagementParity(managementParity)
            .getPrice();
        _fee = TokenParityView(
            IManagementParity(managementParity).tokenParityView()
        ).getRebalancingFee(_tokenId, _indexEvent, _price);
    }

    function getWithdrawalFee(
        uint256 _tokenId,
        uint256 _rate
    ) public view returns (uint256 _fee) {
        uint256 _indexEvent = IManagementParity(managementParity).indexEvent();
        uint256[3] memory _price = IManagementParity(managementParity)
            .getPrice();
        _fee = TokenParityView(
            IManagementParity(managementParity).tokenParityView()
        ).getWithdrawalFee(_tokenId, _rate, _indexEvent, _price);
    }

    function getParityTVL() public view returns (uint256 _tvl) {
        (
            IERC20 _tokenAlpha,
            IERC20 _tokenBeta,
            IERC20 _tokenGamma
        ) = IManagementParity(managementParity).getToken();
        uint256[3] memory _price = IManagementParity(managementParity)
            .getPrice();
        address _safeHouse = IManagementParity(managementParity).safeHouse();
        _tvl =
            (_tokenAlpha.balanceOf(_safeHouse) *
                _price[0] +
                _tokenBeta.balanceOf(_safeHouse) *
                _price[1] +
                _tokenGamma.balanceOf(_safeHouse) *
                _price[2]) /
            ParityData.FACTOR_PRICE_DECIMALS;
    }

    function isCancelWithdrawalRequest(
        uint256 _tokenId
    ) public view returns (bool _isCancel) {
        uint256 _indexEvent = IManagementParity(managementParity).indexEvent();
        (_isCancel, ) = TokenParityView(
            IManagementParity(managementParity).tokenParityView()
        ).isCancelWithdrawalRequest(_tokenId, _indexEvent);
    }

    function getDepositFee(uint256 _amount) public view returns (uint256 _fee) {
        _fee = IManagementParityParams(
            IManagementParity(managementParity).managementParityParams()
        ).getDepositFee(_amount);
    }

    function getMinAmountDeposit() public view returns (uint256) {
        return
            IManagementParityParams(
                IManagementParity(managementParity).managementParityParams()
            ).depositMinAmount();
    }

    function _rebalanceRequest(
        ParityData.Position memory _position,
        bool _isFree,
        uint256 _requestId
    ) internal {
        require(
            (_position.userOption >= 1) && (_position.userOption <= 3),
            "Every.finance:  choice out of range"
        );

        require(
            (_requestId >= 1) && (_requestId <= 3),
            "Every.finance:  requestId out of range"
        );
        require(
            TokenParity(IManagementParity(managementParity).tokenParity())
                .ownerOf(_position.tokenId) != address(0),
            "Every.finance: no token"
        );
        if (_position.userOption == 1) {
            (
                _position.userReturn,
                _position.userWeights.alpha,
                _position.userWeights.beta,
                _position.userWeights.gamma
            ) = ParityLine(parityLine).ConvertRisk(_position.userRisk);
        } else if (_position.userOption == 2) {
            (
                _position.userRisk,
                _position.userWeights.alpha,
                _position.userWeights.beta,
                _position.userWeights.gamma
            ) = ParityLine(parityLine).ConvertReturn(_position.userReturn);
        } else {
            require(
                (_position.userWeights.alpha +
                    _position.userWeights.beta +
                    _position.userWeights.gamma) ==
                    ParityData.COEFF_SCALE_DECIMALS,
                "Every.finance: sum weights"
            );
            (_position.userRisk, _position.userReturn) = ParityLine(parityLine)
                .ConvertWeights(
                    _position.userWeights.alpha,
                    _position.userWeights.beta,
                    _position.userWeights.gamma
                );
        }
        address _tokenParityStorage = IManagementParity(managementParity)
            .tokenParityStorage();
        if (_requestId == 1) {
            TokenParityStorage(_tokenParityStorage)
                .submitRebalancingParityPositionRequest(_position);
            emit SubmitRebalancingRequest(_position);
        } else {
            uint256[3] memory _price = IManagementParity(managementParity)
                .getPrice();
            uint256 _indexEvent = IManagementParity(managementParity)
                .indexEvent();
            if (_requestId == 2){
                TokenParityStorage(_tokenParityStorage).rebalanceParityPosition(
                _position,
                _indexEvent,
                _price,
                _isFree, 
                true
            );
               emit ValidateRebalancingRequest(_position);
            } else {
               TokenParityStorage(_tokenParityStorage).rebalanceParityPosition(
                _position,
                _indexEvent,
                _price,
                _isFree, 
                false
            );
               emit RebalancingManagerRequest(_position); 
            }

        }
    }

    function _sendFees(
        uint256 _amount,
        address _caller
    ) internal returns (uint256 _newAmount) {
        if (_amount > 0) {
            uint256 _fee = getDepositFee(_amount);
            _newAmount = _amount - _fee;
            if (_fee > 0) {
                (
                    address _stableToken,
                    uint256 _amountScaleDecimals
                ) = IManagementParity(managementParity).getStableToken();

                IERC20(_stableToken).safeTransferFrom(
                    _caller,
                    IManagementParity(managementParity).getTreasury(),
                    _fee / _amountScaleDecimals
                );
            }
        }
    }

    function pause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
