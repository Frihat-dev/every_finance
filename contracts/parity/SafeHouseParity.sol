// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../common/Investment.sol";
import "./IManagementParity.sol";

/** 
* @author Every.finance.
* @notice Implementation of the contract SafeHouse.

*/

contract SafeHouseParity is AccessControlEnumerable {
    using SafeERC20 for IERC20;
    using Math for uint256;
    uint256 public constant APPROVED_AMOUNT = 1e50;
    uint256 public constant MAX_PRICE = 1e18;
    bytes32 public constant MANAGER = keccak256("MANAGER");

    address public managementParity;

    constructor(address _admin, address _manager) {
        require(_admin != address(0), "Every.finance: zero address");
        require(_manager != address(0), "Every.finance: zero address");
        _setupRole(DEFAULT_ADMIN_ROLE, _admin);
        _setupRole(MANAGER, _manager);
    }

    function setManagementParity(
        address _managementParity
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_managementParity != address(0), "Every.finance: zero address");
        managementParity = _managementParity;
    }

    function sendTokenFee(ParityData.Amount memory _fee) external {
        require(
            msg.sender ==
                IManagementParity(managementParity).tokenParityStorage(),
            "Every.finance: no required caller"
        );
        address _treasury = IManagementParity(managementParity).getTreasury();
        if (_fee.alpha > 0) {
            IERC20(IManagementParity(managementParity).getToken(0))
                .safeTransfer(_treasury, _fee.alpha);
        }
        if (_fee.beta > 0) {
            IERC20(IManagementParity(managementParity).getToken(1))
                .safeTransfer(_treasury, _fee.beta);
        }
        if (_fee.gamma > 0) {
            IERC20(IManagementParity(managementParity).getToken(2))
                .safeTransfer(_treasury, _fee.gamma);
        }
    }

    function sendBackWithdrawalFee(ParityData.Amount memory _amount) external {
        require(
            msg.sender ==
                IManagementParity(managementParity).tokenParityStorage(),
            "Every.finance: no required caller"
        );
        address _treasury = IManagementParity(managementParity).getTreasury();
        if (_amount.alpha > 0) {
            IERC20(IManagementParity(managementParity).getToken(0))
                .safeTransferFrom(_treasury, address(this), _amount.alpha);
        }
        if (_amount.beta > 0) {
            IERC20(IManagementParity(managementParity).getToken(1))
                .safeTransferFrom(_treasury, address(this), _amount.beta);
        }
        if (_amount.gamma > 0) {
            IERC20(IManagementParity(managementParity).getToken(2))
                .safeTransferFrom(_treasury, address(this), _amount.gamma);
        }
    }

    function sendStableFee(
        address _account,
        uint256 _amount,
        uint256 _fee
    ) external {
        require(
            msg.sender ==
                IManagementParity(managementParity).tokenParityStorage(),
            "Every.finance: no required caller"
        );
        address _treasury = IManagementParity(managementParity).getTreasury();
        (
            address _stableToken,
            uint256 _amountScaleDecimals
        ) = IManagementParity(managementParity).getStableToken();
        if (_amount / _amountScaleDecimals > 0) {
            IERC20(_stableToken).safeTransfer(
                _account,
                _amount / _amountScaleDecimals
            );
        }
        if (_fee / _amountScaleDecimals > 0) {
            IERC20(_stableToken).safeTransfer(
                _treasury,
                _fee / _amountScaleDecimals
            );
        }
    }

    function withdrawStable(
        uint256 _amount,
        address account_
    ) external onlyRole(MANAGER) {
        (
            address _stableToken,
            uint256 _amountScaleDecimals
        ) = IManagementParity(managementParity).getStableToken();
        IERC20(_stableToken).safeTransfer(
            account_,
            _amount / _amountScaleDecimals
        );
    }

    function withdrawToken(
        IERC20 _token,
        uint256 _amount,
        address _account
    ) external onlyRole(MANAGER) {
        _token.safeTransfer(_account, _amount);
    }

    function sendToken(IERC20 _token, uint256 _amount) external {
        require(msg.sender == managementParity, "Every.finance: no caller");
        _token.safeTransfer(msg.sender, _amount);
    }

    function investmentDeposit(address _product, uint256 _amount) external {
        require(msg.sender == managementParity, "Every.finance: no caller");
        (address _stableToken, ) = IManagementParity(managementParity)
            .getStableToken();
        if (IERC20(_stableToken).allowance(address(this), _product) < _amount) {
            IERC20(_stableToken).approve(_product, APPROVED_AMOUNT);
        }
        Investment(payable(_product)).depositRequest(
            managementParity,
            0,
            _amount,
            0,
            MAX_PRICE,
            _amount
        );
    }
}
