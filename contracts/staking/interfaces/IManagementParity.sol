
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../../parity/libraries/ParityData.sol"; 

interface IManagementParity {
    function getToken() external view returns (IERC20, IERC20, IERC20);
    function safeHouse() external view returns(address);
    
}