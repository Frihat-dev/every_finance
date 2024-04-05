// SPDX-License-Identifier: MIT

pragma solidity ^0.8.8;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./LToken.sol";

contract LDeployer {
    function deployLToken(
        address lendingPool_,
        address asset_
    ) external returns (address lToken_) {
        bytes memory bytecode = type(LToken).creationCode;
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
            lToken_ := create2(0, add(bytecode, 32), mload(bytecode), salt)
            if iszero(extcodesize(lToken_)) {
                revert(0, 0)
            }
        }
    }
}
