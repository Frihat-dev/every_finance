// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "./libraries/ConstantLib.sol";

contract LiquidationThreshold is AccessControlEnumerable {
      bytes32 public constant ORACLE = keccak256("ORACLE");
      struct Risk {
        uint256  liquidationThreshold;
        uint256 loanToValue;
        uint256 lastUpdateTime;
      }

      mapping(address => Risk) public tokenRisks;

   constructor(address admin_, address oracle_) {
        require(admin_ != address(0), "zero address");
        require(oracle_ != address(0), "zero address");
        _setupRole(DEFAULT_ADMIN_ROLE, admin_);
        _setupRole(DEFAULT_ADMIN_ROLE, oracle_);
    }

    function updateTokenRisk(
        address token_ , uint256 liquidationThreshold_, uint256 loanToValue_)
    external onlyRole(ORACLE) {
        require(token_ != address(0), "zero address");
        tokenRisks[token_] = Risk(liquidationThreshold_, loanToValue_, block.timestamp);
    }

    function getAssetThreshold(
        address token_
    ) public view returns (uint256, uint256, uint256) {
        require(token_ != address(0), "zero address");

        return (tokenRisks[token_].liquidationThreshold, tokenRisks[token_].loanToValue, block.timestamp);
    }




}
