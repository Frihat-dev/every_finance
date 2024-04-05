
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./libraries/ParityData.sol"; 

interface IManagementParity {
    function sendTokenFee(ParityData.Amount memory _fee) external;
    function sendStableFee(address _account, uint256 _amount,  uint256 _fee) external;
    function indexEvent() external view returns (uint256);
    function sendBackWithdrawalFee(ParityData.Amount memory) external;
    function getStableBalance() external view returns (uint256) ;
    function getDepositFee(uint256 _amount) external view  returns (uint256);
    function getMinAmountDeposit() external view returns (uint256);
    function getTreasury() external view returns (address);
    function getToken() external view returns (IERC20, IERC20, IERC20);
    function getToken(uint256 _id) external view returns(address);
    function getStableToken() external view returns(address, uint256);
    function amountScaleDecimals() external view returns(uint256);
    function getPrice() external view returns(uint256[3] memory);
    function tokenParity() external view returns(address);
    function tokenParityView() external view returns(address);
    function tokenParityStorage() external view returns(address);
    function managementParityParams() external view returns(address);
    function safeHouse() external view returns(address);
    
}