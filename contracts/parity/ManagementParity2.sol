// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./libraries/ParityMath.sol";
import "../common/Investment.sol";
import "./ManagementParityParams.sol";
import "./TokenParityStorage.sol";
import "./TokenParityView.sol";
import "./ISafeHouse.sol";

/** 
* @author Every.finance.
* @notice Implementation of the contract ManagementParity.

*/
contract ManagementParity is IERC721Receiver, AccessControlEnumerable {
    using SafeERC20 for IERC20;
    using Math for uint256;

    uint256 public constant APPROVED_AMOUNT = 1e50;
    uint256 public constant MAX_PRICE = 1e18;
    bytes32 public constant MANAGER = keccak256("MANAGER");

    struct DataIn {
        uint256 totalCashAmount;
        uint256 validatedCashAmount;
        uint256 totalRebalancingCashAmount;
        uint256 validatedRebalancingCashAmount;
        uint256 totalTokenAmount;
        uint256 totalRebalancingTokenAmount;
    }

    struct DataOut {
        uint256 totalCashAmount;
        uint256 validatedCashAmount;
        uint256 totalRebalancingCashAmount;
        uint256 validatedRebalancingCashAmount;
        uint256 totalTokenAmount;
        uint256 totalRebalancingTokenAmount;
    }

    uint256 public amountScaleDecimals;
    uint256 public indexEvent;
    address payable public investmentAlpha;
    address payable public investmentBeta;
    address payable public investmentGamma;
    address public safeHouse;
    address public tokenParityStorage;
    address public tokenParity;
    address public tokenParityView;
    ParityData.Amount public totalCashAmount;
    ParityData.Amount public validatedCashAmount;
    ParityData.Amount public totalRebalancingCashAmount;
    ParityData.Amount public validatedRebalancingCashAmount;
    ParityData.Amount public totalWithdrawalAmount;
    ParityData.Amount public totalRebalancingWithdrawalAmount;
    ParityData.Amount public validatedWithdrawalAmount;
    ParityData.Amount public validatedRebalancingWithdrawalAmount;
    ParityData.Amount public totalTokenAmount;
    ParityData.Amount public totalRebalancingTokenAmount;
    IERC20 public stableToken;
    ManagementParityParams public managementParityParams;

    constructor(
        address _admin,
        address _manager,
        address _managementParityParams,
        address _tokenParity,
        address _tokenParityStorage,
        address _tokenParityView,
        address payable _investmentAlpha,
        address payable _investmentBeta,
        address payable _investmentGamma,
        address _stableToken,
        address _safeHouse
    ) {
        require(_admin != address(0), "Every.finance: zero address");
        require(_manager != address(0), "Every.finance: zero address");
        require(
            _managementParityParams != address(0),
            "Every.finance: zero address"
        );
        require(_tokenParity != address(0), "Every.finance: zero address");
        require(
            _tokenParityStorage != address(0),
            "Every.finance: zero address"
        );
        require(_tokenParityView != address(0), "Every.finance: zero address");
        require(_investmentAlpha != address(0), "Every.finance: zero address");
        require(_investmentBeta != address(0), "Every.finance: zero address");
        require(_investmentGamma != address(0), "Every.finance: zero address");
        require(_stableToken != address(0), "Every.finance: zero address");
        require(_safeHouse != address(0), "Every.finance: zero address");
        managementParityParams = ManagementParityParams(
            _managementParityParams
        );
        investmentAlpha = _investmentAlpha;
        investmentBeta = _investmentBeta;
        investmentGamma = _investmentGamma;
        tokenParityStorage = _tokenParityStorage;
        tokenParityView = _tokenParityView;
        tokenParity = _tokenParity;
        stableToken = IERC20(_stableToken);
        uint8 _stableTokenDecimals = uint8(18) - ERC20(_stableToken).decimals();
        amountScaleDecimals = 10 ** _stableTokenDecimals;
        safeHouse = _safeHouse;
        _setupRole(DEFAULT_ADMIN_ROLE, _admin);
        _setupRole(MANAGER, _manager);
    }

    function getStableBalance() public view returns (uint256) {
        return stableToken.balanceOf(address(this));
    }

    function getStableToken() public view returns (address, uint256) {
        return (address(stableToken), amountScaleDecimals);
    }

    function getPrice() public view returns (uint256[3] memory _price) {
        _price[0] = Investment(investmentAlpha)
            .management()
            .getTokenPrice()
            .value;
        _price[1] = Investment(investmentBeta)
            .management()
            .getTokenPrice()
            .value;
        _price[2] = Investment(investmentGamma)
            .management()
            .getTokenPrice()
            .value;
    }

    function getToken() public view returns (IERC20, IERC20, IERC20) {
        address _tokenAlpha = address(Investment(investmentAlpha).token());
        address _tokenBeta = address(Investment(investmentBeta).token());
        address _tokenGamma = address(Investment(investmentGamma).token());
        return (IERC20(_tokenAlpha), IERC20(_tokenBeta), IERC20(_tokenGamma));
    }

    function getTreasury() public view returns (address) {
        return managementParityParams.treasury();
    }

    function getToken(uint256 _id) public view returns (address) {
        require(_id >= 0 && _id <= 2, "Every.finance: not in range");
        if (_id == 0) {
            return address(Investment(investmentAlpha).token());
        } else if (_id == 1) {
            return address(Investment(investmentBeta).token());
        } else {
            return address(Investment(investmentGamma).token());
        }
    }

    function setManagementParityParams(
        address _managementParityParams
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            _managementParityParams != address(0),
            "Every.finance: zero address"
        );
        managementParityParams = ManagementParityParams(
            _managementParityParams
        );
    }

    function setParityTokens(
        address _tokenParity,
        address _tokenParityStorage,
        address _tokenParityView
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_tokenParity != address(0), "Every.finance: zero address");
        require(
            _tokenParityStorage != address(0),
            "Every.finance: zero address"
        );
        require(_tokenParityView != address(0), "Every.finance: zero address");
        tokenParity = _tokenParity;
        tokenParityStorage = _tokenParityStorage;
        tokenParityView = _tokenParityView;
    }

    function setInvestments(
        address payable _investmentAlpha,
        address payable _investmentBeta,
        address payable _investmentGamma
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_investmentAlpha != address(0), "Every.finance: zero address");
        require(_investmentBeta != address(0), "Every.finance: zero address");
        require(_investmentGamma != address(0), "Every.finance: zero address");
        investmentAlpha = _investmentAlpha;
        investmentBeta = _investmentBeta;
        investmentGamma = _investmentGamma;
    }

    function setStableToken(
        address _stableToken
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_stableToken != address(0), "Every.finance: zero address");
        stableToken = IERC20(_stableToken);
        uint8 _stableTokenDecimals = uint8(18) - ERC20(_stableToken).decimals();
        amountScaleDecimals = 10 ** _stableTokenDecimals;
    }

    function withdrawStable(
        uint256 _amount,
        address _account
    ) external onlyRole(MANAGER) {
        stableToken.safeTransfer(_account, _amount / amountScaleDecimals);
    }

    function withdrawToken(
        IERC20 _token,
        uint256 _amount,
        address _account
    ) external onlyRole(MANAGER) {
        _token.safeTransfer(_account, _amount);
    }

    function startNextEvent() external onlyRole(MANAGER) {
        indexEvent += 1;
    }

    function depositManagerRequest(
        ParityData.Amount memory depositAmount_
    ) external onlyRole(MANAGER) {
        TokenParityStorage(tokenParityStorage).updateTotalBalances(
            depositAmount_,
            ParityData.Amount(0, 0, 0),
            ParityData.Amount(0, 0, 0),
            ParityData.Amount(0, 0, 0)
        );
        ParityMath.add(totalCashAmount, depositAmount_);
        _deposit(depositAmount_);
    }

    function rebalancingDepositManagerRequest(
        ParityData.Amount memory rebalancingDepositAmount_
    ) external onlyRole(MANAGER) {
        require(
            totalRebalancingTokenAmount.alpha >=
                rebalancingDepositAmount_.alpha,
            "max value"
        );
        require(
            totalRebalancingTokenAmount.beta >= rebalancingDepositAmount_.beta,
            "max value"
        );
        require(
            totalRebalancingTokenAmount.gamma >=
                rebalancingDepositAmount_.gamma,
            "max value"
        );
        TokenParityStorage(tokenParityStorage).updateTotalBalances(
            ParityData.Amount(0, 0, 0),
            ParityData.Amount(0, 0, 0),
            rebalancingDepositAmount_,
            ParityData.Amount(0, 0, 0)
        );
        ParityMath.add(totalRebalancingCashAmount, rebalancingDepositAmount_);
        ParityMath.sub(totalRebalancingTokenAmount, rebalancingDepositAmount_);
        _deposit(rebalancingDepositAmount_);
    }

    function withdrawManagerRequest(
        ParityData.Amount memory withdrawalAmount_,
        ParityData.Amount memory rebalancingWithdrawalAmount_
    ) external onlyRole(MANAGER) {
        ParityData.Amount memory amount_ = ParityMath.add2(
            withdrawalAmount_,
            rebalancingWithdrawalAmount_
        );
        TokenParityStorage(tokenParityStorage).updateTotalBalances(
            ParityData.Amount(0, 0, 0),
            withdrawalAmount_,
            ParityData.Amount(0, 0, 0),
            rebalancingWithdrawalAmount_
        );
        ParityMath.add(totalWithdrawalAmount, withdrawalAmount_);
        ParityMath.add(
            totalRebalancingWithdrawalAmount,
            rebalancingWithdrawalAmount_
        );

        _withdraw(amount_);
    }

    function distributeToken(
        uint256 _id,
        uint256[] memory _tokenIds
    ) external onlyRole(MANAGER) {
        _distributeTokens(_id, _tokenIds);
    }

    function _deposit(ParityData.Amount memory _amount) internal {
        if (_amount.alpha > 0) {
            ISafeHouse(safeHouse).investmentDeposit(
                investmentAlpha,
                _amount.alpha
            );
        }

        if (_amount.beta > 0) {
            ISafeHouse(safeHouse).investmentDeposit(
                investmentBeta,
                _amount.beta
            );
        }

        if (_amount.gamma > 0) {
            ISafeHouse(safeHouse).investmentDeposit(
                investmentGamma,
                _amount.gamma
            );
        }
    }

    function _withdraw(ParityData.Amount memory _amount) internal {
        address _token;
        if (_amount.alpha > 0) {
            _token = address(Investment(investmentAlpha).token());
            _investmentWithdraw(investmentAlpha, IERC20(_token), _amount.alpha);
        }

        if (_amount.beta > 0) {
            _token = address(Investment(investmentBeta).token());
            _investmentWithdraw(investmentBeta, IERC20(_token), _amount.beta);
        }

        if (_amount.gamma > 0) {
            _token = address(Investment(investmentGamma).token());
            _investmentWithdraw(investmentGamma, IERC20(_token), _amount.gamma);
        }
    }

    function _investmentWithdraw(
        address _product,
        IERC20 _token,
        uint256 _amount
    ) internal {
        if (_token.allowance(address(this), _product) < _amount) {
            _token.approve(_product, APPROVED_AMOUNT);
        }
        ISafeHouse(safeHouse).sendToken(_token, _amount);
        Investment(payable(_product)).withdrawalRequest(
            0,
            _amount,
            0,
            MAX_PRICE,
            _amount
        );
    }

    function _distributeTokens(
        uint256 _id,
        uint256[] memory _tokenIds
    ) internal {
        require(indexEvent != 0, "Every.finance : no event");
        require(_id >= 0 && _id <= 2, "Every.finance: not in range");
        address token_ = getToken(_id);
        uint256 _amount = IERC20(token_).balanceOf(address(this));
        uint256 _totalTokenAmount;
        uint256 _totalRebalancingTokenAmount;
        DataOut memory _dataOut;
        if (_id == 0) {
            if (
                _amount != 0 &&
                (totalCashAmount.alpha + totalRebalancingCashAmount.alpha) != 0
            ) {
                _totalTokenAmount = Math.mulDiv(
                    _amount,
                    totalCashAmount.alpha,
                    (totalCashAmount.alpha + totalRebalancingCashAmount.alpha)
                );
                _totalRebalancingTokenAmount = Math.mulDiv(
                    _amount,
                    totalRebalancingCashAmount.alpha,
                    (totalCashAmount.alpha + totalRebalancingCashAmount.alpha)
                );

                _dataOut = _distributeDepositToken(
                    _id,
                    DataIn(
                        totalCashAmount.alpha,
                        validatedCashAmount.alpha,
                        totalRebalancingCashAmount.alpha,
                        validatedRebalancingCashAmount.alpha,
                        _totalTokenAmount,
                        _totalRebalancingTokenAmount
                    ),
                    _tokenIds
                );

                totalCashAmount.alpha = _dataOut.totalCashAmount;
                validatedCashAmount.alpha = _dataOut.validatedCashAmount;
                totalRebalancingCashAmount.alpha = _dataOut
                    .totalRebalancingCashAmount;
                validatedRebalancingCashAmount.alpha = _dataOut
                    .validatedRebalancingCashAmount;

                delete _dataOut;
            }

            //_totalCashAmount = Math.mulDiv(totalWithdrawalAmount.alpha, totalCashAmount.alpha, (totalWithdrawalAmount.alpha + totalRebalancingWithdrawalAmount.alpha));
            if (
                (totalWithdrawalAmount.alpha != 0) ||
                (totalRebalancingWithdrawalAmount.alpha) != 0
            )
                _dataOut = _distributeWithdrawalToken(
                    _id,
                    DataIn(
                        totalWithdrawalAmount.alpha,
                        validatedWithdrawalAmount.alpha,
                        totalRebalancingWithdrawalAmount.alpha,
                        validatedRebalancingWithdrawalAmount.alpha,
                        totalTokenAmount.alpha,
                        totalRebalancingTokenAmount.alpha
                    ),
                    _tokenIds
                );

            totalWithdrawalAmount.alpha = _dataOut.totalCashAmount;
            validatedWithdrawalAmount.alpha = _dataOut.validatedCashAmount;
            totalRebalancingWithdrawalAmount.alpha = _dataOut
                .totalRebalancingCashAmount;
            validatedRebalancingWithdrawalAmount.alpha = _dataOut
                .validatedRebalancingCashAmount;
            totalTokenAmount.alpha = _dataOut.totalTokenAmount;
            // totalRebalancingTokenAmount.alpha = _dataOut
            //    .totalRebalancingTokenAmount;
        } else if (_id == 1) {
            if (
                _amount != 0 &&
                (totalCashAmount.beta + totalRebalancingCashAmount.beta) != 0
            ) {
                _totalTokenAmount = Math.mulDiv(
                    _amount,
                    totalCashAmount.beta,
                    (totalCashAmount.beta + totalRebalancingCashAmount.beta)
                );
                _totalRebalancingTokenAmount = Math.mulDiv(
                    _amount,
                    totalRebalancingCashAmount.beta,
                    (totalCashAmount.beta + totalRebalancingCashAmount.beta)
                );
                _dataOut = _distributeDepositToken(
                    _id,
                    DataIn(
                        totalCashAmount.beta,
                        validatedCashAmount.beta,
                        totalRebalancingCashAmount.beta,
                        validatedRebalancingCashAmount.beta,
                        _totalTokenAmount,
                        _totalRebalancingTokenAmount
                    ),
                    _tokenIds
                );

                totalCashAmount.beta = _dataOut.totalCashAmount;
                validatedCashAmount.beta = _dataOut.validatedCashAmount;
                totalRebalancingCashAmount.beta = _dataOut
                    .totalRebalancingCashAmount;
                validatedRebalancingCashAmount.beta = _dataOut
                    .validatedRebalancingCashAmount;
                delete _dataOut;
            }

            // _totalCashAmount = Math.mulDiv(totalWithdrawalAmount.beta, totalTokenAmount.beta, (totalWithdrawalAmount.beta + totalRebalancingWithdrawalAmount.beta));
            if (
                (totalWithdrawalAmount.beta != 0) ||
                (totalRebalancingWithdrawalAmount.beta) != 0
            ) {
                _dataOut = _distributeWithdrawalToken(
                    _id,
                    DataIn(
                        totalWithdrawalAmount.beta,
                        validatedWithdrawalAmount.beta,
                        totalRebalancingWithdrawalAmount.beta,
                        validatedRebalancingWithdrawalAmount.beta,
                        totalTokenAmount.beta,
                        totalRebalancingTokenAmount.beta
                    ),
                    _tokenIds
                );

                totalWithdrawalAmount.beta = _dataOut.totalCashAmount;
                validatedWithdrawalAmount.beta = _dataOut.validatedCashAmount;
                totalRebalancingWithdrawalAmount.beta = _dataOut
                    .totalRebalancingCashAmount;
                validatedRebalancingWithdrawalAmount.beta = _dataOut
                    .validatedRebalancingCashAmount;
                totalTokenAmount.beta = _dataOut.totalTokenAmount;
                //totalRebalancingTokenAmount.beta = _dataOut
                //  .totalRebalancingTokenAmount;
            }
        } else {
            if (
                _amount != 0 &&
                (totalCashAmount.gamma + totalRebalancingCashAmount.gamma) != 0
            ) {
                _totalTokenAmount = Math.mulDiv(
                    _amount,
                    totalCashAmount.gamma,
                    (totalCashAmount.gamma + totalRebalancingCashAmount.gamma)
                );
                _totalRebalancingTokenAmount = Math.mulDiv(
                    _amount,
                    totalRebalancingCashAmount.gamma,
                    (totalCashAmount.gamma + totalRebalancingCashAmount.gamma)
                );
                _dataOut = _distributeDepositToken(
                    _id,
                    DataIn(
                        totalCashAmount.gamma,
                        validatedCashAmount.gamma,
                        totalRebalancingCashAmount.gamma,
                        validatedRebalancingCashAmount.gamma,
                        _totalTokenAmount,
                        _totalRebalancingTokenAmount
                    ),
                    _tokenIds
                );

                totalCashAmount.gamma = _dataOut.totalCashAmount;
                validatedCashAmount.gamma = _dataOut.validatedCashAmount;
                totalRebalancingCashAmount.gamma = _dataOut
                    .totalRebalancingCashAmount;
                validatedRebalancingCashAmount.gamma = _dataOut
                    .validatedRebalancingCashAmount;
                delete _dataOut;
            }

            // _totalCashAmount = Math.mulDiv(totalWithdrawalAmount.gamma, totalCashAmount.gamma, (totalWithdrawalAmount.gamma + totalRebalancingWithdrawalAmount.gamma));
            if (
                (totalWithdrawalAmount.gamma != 0) ||
                (totalRebalancingWithdrawalAmount.gamma) != 0
            ) {
                _dataOut = _distributeWithdrawalToken(
                    _id,
                    DataIn(
                        totalWithdrawalAmount.gamma,
                        validatedWithdrawalAmount.gamma,
                        totalRebalancingWithdrawalAmount.gamma,
                        validatedRebalancingWithdrawalAmount.gamma,
                        totalTokenAmount.gamma,
                        totalRebalancingTokenAmount.gamma
                    ),
                    _tokenIds
                );

                totalWithdrawalAmount.gamma = _dataOut.totalCashAmount;
                validatedWithdrawalAmount.gamma = _dataOut.validatedCashAmount;
                totalRebalancingWithdrawalAmount.gamma = _dataOut
                    .totalRebalancingCashAmount;
                validatedRebalancingWithdrawalAmount.gamma = _dataOut
                    .validatedRebalancingCashAmount;
                totalTokenAmount.gamma = _dataOut.totalTokenAmount;
                //totalRebalancingTokenAmount.gamma = _dataOut
                //    .totalRebalancingTokenAmount;
            }
        }
    }

    function _distributeDepositToken(
        uint256 _id,
        DataIn memory _dataIn,
        uint256[] memory _tokenIds
    ) internal returns (DataOut memory _dataOut) {
        uint256 _cashAmount;
        uint256 __totalCashAmount;
        uint256 _tokenAmount;
        uint256 __totalTokenAmount;
        uint256 __totalRebalancingCashAmount;
        uint256 __totalRebalancingTokenAmount;
        for (uint256 i = 0; i < _tokenIds.length; ++i) {
            if (IERC721(tokenParity).ownerOf(_tokenIds[i]) == address(0)) {
                continue;
            }
            _cashAmount = TokenParityView(tokenParityView)
                .getTotalDepositUntilLastEvent(_tokenIds[i], indexEvent, _id);

            if (
                _cashAmount != 0 &&
                _dataIn.totalTokenAmount != 0 &&
                _dataIn.totalCashAmount != 0 &&
                _dataIn.validatedCashAmount != 0
            ) {
                _cashAmount = Math.min(
                    _cashAmount,
                    Math.mulDiv(
                        _cashAmount,
                        _dataIn.validatedCashAmount,
                        _dataIn.totalCashAmount
                    )
                );

                _cashAmount = Math.min(
                    _cashAmount,
                    _dataIn.validatedCashAmount - __totalCashAmount
                );
                _tokenAmount = Math.mulDiv(
                    _cashAmount,
                    _dataIn.totalTokenAmount,
                    _dataIn.validatedCashAmount
                );

                _tokenAmount = Math.min(
                    _tokenAmount,
                    _dataIn.totalTokenAmount - __totalTokenAmount
                );
                __totalCashAmount += _cashAmount;
                __totalTokenAmount += _tokenAmount;
                TokenParityStorage(tokenParityStorage)
                    .updateDepositBalancePerToken(
                        _tokenIds[i],
                        _cashAmount,
                        indexEvent,
                        _id
                    );
                if (_tokenAmount != 0) {
                    TokenParityStorage(tokenParityStorage)
                        .updateTokenBalancePerToken(
                            _tokenIds[i],
                            _tokenAmount,
                            _id
                        );
                }
            }

            _cashAmount = TokenParityView(tokenParityView)
                .getTotalDepositRebalancingUntilLastEvent(
                    _tokenIds[i],
                    indexEvent,
                    _id
                );
            if (
                (_cashAmount != 0) &&
                (_dataIn.totalRebalancingTokenAmount != 0) &&
                (_dataIn.totalRebalancingCashAmount != 0) &&
                (_dataIn.validatedRebalancingCashAmount) != 0
            ) {
                _cashAmount = Math.min(
                    _cashAmount,
                    Math.mulDiv(
                        _cashAmount,
                        _dataIn.validatedRebalancingCashAmount,
                        _dataIn.totalRebalancingCashAmount
                    )
                );

                _cashAmount = Math.min(
                    _cashAmount,
                    _dataIn.validatedRebalancingCashAmount -
                        __totalRebalancingCashAmount
                );

                _tokenAmount = Math.mulDiv(
                    _cashAmount,
                    _dataIn.totalRebalancingTokenAmount,
                    _dataIn.validatedRebalancingCashAmount
                );

                _tokenAmount = Math.min(
                    _tokenAmount,
                    _dataIn.totalRebalancingTokenAmount -
                        __totalRebalancingTokenAmount
                );
                TokenParityStorage(tokenParityStorage)
                    .updateRebalancingDepositBalancePerToken(
                        _tokenIds[i],
                        _cashAmount,
                        indexEvent,
                        _id
                    );
                __totalRebalancingCashAmount += _cashAmount;
                __totalRebalancingTokenAmount += _tokenAmount;
                if (_tokenAmount != 0) {
                    TokenParityStorage(tokenParityStorage)
                        .updateTokenBalancePerToken(
                            _tokenIds[i],
                            _tokenAmount,
                            _id
                        );
                }
            }
        }
        _dataOut.totalCashAmount = _dataIn.totalCashAmount - __totalCashAmount;
        _dataOut.validatedCashAmount =
            _dataIn.validatedCashAmount -
            __totalCashAmount;
        _dataOut.totalRebalancingCashAmount =
            _dataIn.totalRebalancingCashAmount -
            __totalRebalancingCashAmount;
        _dataOut.validatedRebalancingCashAmount =
            _dataIn.validatedRebalancingCashAmount -
            __totalRebalancingCashAmount;
        if ((__totalTokenAmount + __totalRebalancingTokenAmount) != 0) {
            IERC20(getToken(_id)).safeTransfer(
                safeHouse,
                __totalTokenAmount + __totalRebalancingTokenAmount
            );
        }
    }

    function _distributeWithdrawalToken(
        uint256 _id,
        DataIn memory _dataIn,
        uint256[] memory _tokenIds
    ) internal returns (DataOut memory _dataOut) {
        uint256 _withdrawalAmount;
        uint256 _cashAmount;
        uint256 __totalCashAmount;
        // uint256 __totalRebalancingCashAmount;
        uint256 __totalWithdrawalAmount;
        uint256 __totalRebalancingWithdrawalAmount;

        for (uint256 i = 0; i < _tokenIds.length; ++i) {
            if (IERC721(tokenParity).ownerOf(_tokenIds[i]) == address(0)) {
                continue;
            }
            _withdrawalAmount = TokenParityView(tokenParityView)
                .getTotalWithdrawalUntilLastEvent(
                    _tokenIds[i],
                    indexEvent,
                    _id
                );
            if (
                (_dataIn.totalCashAmount != 0) &&
                (_withdrawalAmount != 0) &&
                (_dataIn.validatedCashAmount != 0)
            ) {
                _withdrawalAmount = Math.min(
                    _withdrawalAmount,
                    Math.mulDiv(
                        _withdrawalAmount,
                        _dataIn.validatedCashAmount,
                        _dataIn.totalCashAmount
                    )
                );

                _withdrawalAmount = Math.min(
                    _withdrawalAmount,
                    _dataIn.validatedCashAmount - __totalWithdrawalAmount
                );
                _cashAmount = Math.mulDiv(
                    _withdrawalAmount,
                    _dataIn.totalTokenAmount,
                    _dataIn.validatedCashAmount
                );

                _cashAmount = Math.min(
                    _cashAmount,
                    _dataIn.totalTokenAmount - __totalCashAmount
                );

                TokenParityStorage(tokenParityStorage)
                    .updateWithdrawalBalancePerToken(
                        _tokenIds[i],
                        _withdrawalAmount,
                        indexEvent,
                        _id
                    );
                stableToken.safeTransfer(
                    IERC721(tokenParity).ownerOf(_tokenIds[i]),
                    _cashAmount / amountScaleDecimals
                );
                __totalWithdrawalAmount += _withdrawalAmount;
                __totalCashAmount += _cashAmount;
            }
            _withdrawalAmount = TokenParityView(tokenParityView)
                .getTotalWithdrawalRebalancingUntilLastEvent(
                    _tokenIds[i],
                    indexEvent,
                    _id
                );
            if (
                (_dataIn.totalRebalancingCashAmount != 0) &&
                (_withdrawalAmount != 0)
            ) {
                _withdrawalAmount = Math.min(
                    _withdrawalAmount,
                    Math.mulDiv(
                        _withdrawalAmount,
                        _dataIn.validatedRebalancingCashAmount,
                        _dataIn.totalRebalancingCashAmount
                    )
                );
                _withdrawalAmount = Math.min(
                    _withdrawalAmount,
                    _dataIn.validatedRebalancingCashAmount -
                        __totalRebalancingWithdrawalAmount
                );
                // _cashAmount = Math.mulDiv(
                //   _withdrawalAmount,
                //  _dataIn.totalRebalancingTokenAmount,
                //  _dataIn.validatedRebalancingCashAmount
                // );

                // _cashAmount = Math.min(
                //   _cashAmount,
                //  _dataIn.totalRebalancingTokenAmount -
                //    __totalRebalancingCashAmount
                //);
                TokenParityStorage(tokenParityStorage)
                    .updateRebalancingWithdrawalBalancePerToken(
                        _tokenIds[i],
                        _withdrawalAmount,
                        indexEvent,
                        _id
                    );
                __totalRebalancingWithdrawalAmount += _withdrawalAmount;
                // __totalRebalancingCashAmount += _cashAmount;
            }
        }
        _dataOut.totalCashAmount =
            _dataIn.totalCashAmount -
            __totalWithdrawalAmount;
        _dataOut.validatedCashAmount =
            _dataIn.validatedCashAmount -
            __totalWithdrawalAmount;
        _dataOut.totalRebalancingCashAmount =
            _dataIn.totalRebalancingCashAmount -
            __totalRebalancingWithdrawalAmount;
        _dataOut.validatedRebalancingCashAmount =
            _dataIn.validatedRebalancingCashAmount -
            __totalRebalancingWithdrawalAmount;
        _dataOut.totalTokenAmount =
            _dataIn.totalTokenAmount -
            __totalCashAmount;
        // _dataOut.totalRebalancingTokenAmount =
        //   _dataIn.totalRebalancingTokenAmount -
        //  __totalRebalancingCashAmount;
        // _dataOut.totalRebalancingTokenAmount = _dataIn.totalRebalancingTokenAmount - __totalRebalancingCashAmount;
    }

    function setDepositData(
        uint256 _amountMinted,
        uint256 _amountValidated,
        uint256 _id
    ) external {
        require(_id >= 0 && _id <= 2, "Every.finance: not in range");
        require(
            (_amountMinted > 0) && (_amountValidated > 0),
            "Every.finance: zero amount"
        );
        uint256 _totalAmount;
        uint256 _amount;
        if (_id == 0) {
            require(msg.sender == investmentAlpha, "Every.finance: no caller");
            _totalAmount =
                totalCashAmount.alpha +
                totalRebalancingCashAmount.alpha;
            _amount = Math.mulDiv(
                _amountValidated,
                totalCashAmount.alpha,
                _totalAmount
            );
            _amount = Math.min(
                _amount,
                totalCashAmount.alpha - validatedCashAmount.alpha
            );
            validatedCashAmount.alpha += _amount;
            validatedRebalancingCashAmount.alpha += (_amountValidated -
                _amount);
        } else if (_id == 1) {
            require(msg.sender == investmentBeta, "Every.finance: no caller");
            _totalAmount =
                totalCashAmount.beta +
                totalRebalancingCashAmount.beta;
            _amount = Math.mulDiv(
                _amountValidated,
                totalCashAmount.beta,
                _totalAmount
            );
            _amount = Math.min(
                _amount,
                totalCashAmount.beta - validatedCashAmount.beta
            );
            validatedCashAmount.beta += _amount;
            validatedRebalancingCashAmount.beta += (_amountValidated - _amount);
        } else {
            require(msg.sender == investmentGamma, "Every.finance: no caller");
            _totalAmount =
                totalCashAmount.gamma +
                totalRebalancingCashAmount.gamma;
            _amount = Math.mulDiv(
                _amountValidated,
                totalCashAmount.gamma,
                _totalAmount
            );
            _amount = Math.min(
                _amount,
                totalCashAmount.gamma - validatedCashAmount.gamma
            );
            validatedCashAmount.gamma += _amount;
            validatedRebalancingCashAmount.gamma += (_amountValidated -
                _amount);
        }
    }

    function setWithdrawalData(
        uint256 _amountMinted,
        uint256 _amountValidated,
        uint256 _id
    ) external {
        require(_id >= 0 && _id <= 2, "Every.finance: not in range");
        require(
            (_amountMinted > 0) && (_amountValidated > 0),
            "Every.finance: zero amount"
        );
        uint256 _totalAmount;
        uint256 _amount;
        uint256 _rebalancingAmount;
        uint256 _totalWithdrawalAmount;
        uint256 _totalRebalancingWithdrawalAmount;
        uint256 _validatedWithdrawalAmount;
        uint256 _validatedRebalancingWithdrawalAmount;

        if (_id == 0) {
            require(msg.sender == investmentAlpha, "Every.finance: no caller");
            _totalWithdrawalAmount = totalWithdrawalAmount.alpha;
            _totalRebalancingWithdrawalAmount = totalRebalancingWithdrawalAmount
                .alpha;
            _validatedWithdrawalAmount = validatedWithdrawalAmount.alpha;
            _validatedRebalancingWithdrawalAmount = validatedRebalancingWithdrawalAmount
                .alpha;
            _totalAmount =
                _totalWithdrawalAmount +
                _totalRebalancingWithdrawalAmount;

            _amount = Math.min(
                (_totalWithdrawalAmount - _validatedWithdrawalAmount),
                Math.mulDiv(
                    _amountValidated,
                    totalWithdrawalAmount.alpha,
                    _totalAmount
                )
            );

            _rebalancingAmount = Math.min(
                (_totalRebalancingWithdrawalAmount -
                    _validatedRebalancingWithdrawalAmount),
                Math.mulDiv(
                    _amountValidated,
                    totalRebalancingWithdrawalAmount.alpha,
                    _totalAmount
                )
            );

            validatedWithdrawalAmount.alpha =
                _validatedWithdrawalAmount +
                _amount;

            validatedRebalancingWithdrawalAmount.alpha =
                _validatedRebalancingWithdrawalAmount +
                _rebalancingAmount;

            totalTokenAmount.alpha += Math.mulDiv(
                _amountMinted,
                _amount,
                (_amount + _rebalancingAmount)
            );
            totalRebalancingTokenAmount.alpha += Math.mulDiv(
                _amountMinted,
                _rebalancingAmount,
                (_amount + _rebalancingAmount)
            );
        } else if (_id == 1) {
            require(msg.sender == investmentBeta, "Every.finance: no caller");
            _totalWithdrawalAmount = totalWithdrawalAmount.beta;
            _totalRebalancingWithdrawalAmount = totalRebalancingWithdrawalAmount
                .beta;
            _validatedWithdrawalAmount = validatedWithdrawalAmount.beta;
            _validatedRebalancingWithdrawalAmount = validatedRebalancingWithdrawalAmount
                .beta;
            _totalAmount =
                _totalWithdrawalAmount +
                _totalRebalancingWithdrawalAmount;

            _amount = Math.min(
                (_totalWithdrawalAmount - _validatedWithdrawalAmount),
                Math.mulDiv(
                    _amountValidated,
                    totalWithdrawalAmount.beta,
                    _totalAmount
                )
            );

            _rebalancingAmount = Math.min(
                (_totalRebalancingWithdrawalAmount -
                    _validatedRebalancingWithdrawalAmount),
                Math.mulDiv(
                    _amountValidated,
                    totalRebalancingWithdrawalAmount.beta,
                    _totalAmount
                )
            );

            validatedWithdrawalAmount.beta =
                _validatedWithdrawalAmount +
                _amount;

            validatedRebalancingWithdrawalAmount.beta =
                _validatedRebalancingWithdrawalAmount +
                _rebalancingAmount;

            totalTokenAmount.beta += Math.mulDiv(
                _amountMinted,
                _amount,
                (_amount + _rebalancingAmount)
            );
            totalRebalancingTokenAmount.beta += Math.mulDiv(
                _amountMinted,
                _rebalancingAmount,
                (_amount + _rebalancingAmount)
            );
        } else {
            require(msg.sender == investmentGamma, "Every.finance: no caller");
            _totalWithdrawalAmount = totalWithdrawalAmount.gamma;
            _totalRebalancingWithdrawalAmount = totalRebalancingWithdrawalAmount
                .gamma;
            _validatedWithdrawalAmount = validatedWithdrawalAmount.gamma;
            _validatedRebalancingWithdrawalAmount = validatedRebalancingWithdrawalAmount
                .gamma;
            _totalAmount =
                _totalWithdrawalAmount +
                _totalRebalancingWithdrawalAmount;

            _amount = Math.min(
                (_totalWithdrawalAmount - _validatedWithdrawalAmount),
                Math.mulDiv(
                    _amountValidated,
                    totalWithdrawalAmount.gamma,
                    _totalAmount
                )
            );

            _rebalancingAmount = Math.min(
                (_totalRebalancingWithdrawalAmount -
                    _validatedRebalancingWithdrawalAmount),
                Math.mulDiv(
                    _amountValidated,
                    totalRebalancingWithdrawalAmount.gamma,
                    _totalAmount
                )
            );

            validatedWithdrawalAmount.gamma =
                _validatedWithdrawalAmount +
                _amount;

            validatedRebalancingWithdrawalAmount.gamma =
                _validatedRebalancingWithdrawalAmount +
                _rebalancingAmount;

            totalTokenAmount.gamma += Math.mulDiv(
                _amountMinted,
                _amount,
                (_amount + _rebalancingAmount)
            );
            totalRebalancingTokenAmount.gamma += Math.mulDiv(
                _amountMinted,
                _rebalancingAmount,
                (_amount + _rebalancingAmount)
            );
        }
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) public virtual override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
