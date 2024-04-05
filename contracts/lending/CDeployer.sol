// SPDX-License-Identifier: MIT

pragma solidity ^0.8.8;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./CToken.sol";

contract CDeployer {
    function deployLToken(
        address lendingPool_,
        address asset_
    ) external returns (address cToken_) {
        bytes memory bytecode = type(CToken).creationCode;
        string memory name_;
        string memory symbol_;
        if (asset_ == address(0)) {
            name_ = "Eth";
            symbol_ = "ETH";
        } else {
            name_ = ERC20(asset_).name();
            symbol_ = ERC20(asset_).symbol();
        }
        string memory lTokenName_ = string(abi.encodePacked("l", name_));
        string memory lTokenSymbol_ = string(abi.encodePacked("l", symbol_));
        bytecode = abi.encodePacked(
            bytecode,
            abi.encode(lTokenName_, lTokenSymbol_, lendingPool_)
        );
        bytes32 salt = keccak256(
            abi.encodePacked(msg.sender, lendingPool_, asset_)
        );
        assembly {
            cToken_ := create2(0, add(bytecode, 32), mload(bytecode), salt)
            if iszero(extcodesize(cToken_)) {
                revert(0, 0)
            }
        }
    }
}
