
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "../../parity/libraries/ParityData.sol"; 

interface ITokenParityStorage {
    function tokenBalancePerToken(uint256 tokenId) external view returns (ParityData.Amount memory);  
    function weightsPerToken(uint256 tokenId) external view returns (ParityData.Amount memory);    
}