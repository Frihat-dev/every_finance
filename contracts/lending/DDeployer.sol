// SPDX-License-Identifier: MIT

pragma solidity ^0.8.8;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./DToken.sol";

contract DDeployer {
    function deployDToken(
        address lendingPool_,
        address asset_
    ) external returns (address dToken_) {
        bytes memory bytecode = type(DToken).creationCode;
        string memory name_;
        string memory symbol_;
        if (asset_ == address(0)) {
            name_ = "Eth";
            symbol_ = "ETH";
        } else {
            name_ = ERC20(asset_).name();
            symbol_ = ERC20(asset_).symbol();
        }
        string memory dTokenName_ = string(abi.encodePacked("d", name_));
        string memory dTokenSymbol_ = string(abi.encodePacked("d", symbol_));
        bytecode = abi.encodePacked(
            bytecode,
            abi.encode(dTokenName_, dTokenSymbol_, lendingPool_)
        );
        bytes32 salt = keccak256(
            abi.encodePacked(msg.sender, lendingPool_, asset_)
        );

        assembly {
            dToken_ := create2(0, add(bytecode, 32), mload(bytecode), salt)
            if iszero(extcodesize(dToken_)) {
                revert(0, 0)
            }
        }
    }
}
