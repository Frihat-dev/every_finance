// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./libraries/ParityData.sol"; 

interface ISafeHouse {
    
  function sendTokenFee(ParityData.Amount memory _fee) external;
  function sendBackWithdrawalFee(ParityData.Amount memory _amount) external;
  function sendStableFee(address _account, uint256 _amount, uint256  _fee) external; 
  function sendToken(IERC20 _token, uint256 _amount) external; 
  function investmentDeposit (address _product, uint256 _amount) external;
    
}