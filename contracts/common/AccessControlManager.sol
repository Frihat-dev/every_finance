// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

contract AccessControlManager is AccessControl {
    bytes32 public constant  HUB_ADMIN = keccak256("HUB_ADMIN");
    bytes32 public constant  SPOKE_ADMIN = keccak256("SPOKE_ADMIN");
    bytes32 public constant  GATEWAY_ADMIN = keccak256("GATEWAY_ADMIN");
    bytes32 public constant  EMERGENCY_ADMIN =
        keccak256("EMERGENCY_ADMIN");
    bytes32 public constant  RISK_ADMIN = keccak256("RISK_ADMIN");
    bytes32 public constant  ASSET_LISTING_ADMIN =
        keccak256("ASSET_LISTING_ADMIN");
    bytes32 public constant  CHAIN_LISTING_ADMIN =
        keccak256("CHAIN_LISTING_ADMIN");

    address public admin;
    constructor(address _admin) {
        require( _admin != address(0), "zero address");
        admin = _admin;
        _setupRole(DEFAULT_ADMIN_ROLE, _admin);
    }

    function setRoleAdmin(
        bytes32 role,
        bytes32 adminRole
    ) external  onlyRole(DEFAULT_ADMIN_ROLE) {
        _setRoleAdmin(role, adminRole);
    }

    function addHubAdmin(address _admin) external  {
        grantRole(HUB_ADMIN, _admin);
    }

  
    function removeHubAdmin(address _admin) external  {
        revokeRole(HUB_ADMIN, _admin);
    }

   
    function isHubAdmin(address _admin) external view  returns (bool) {
        return hasRole(HUB_ADMIN, _admin);
    }


    function addSpokedmin(address _admin) external  {
        grantRole(SPOKE_ADMIN, _admin);
    }

  
    function removeSpokeAdmin(address _admin) external  {
        revokeRole(SPOKE_ADMIN, _admin);
    }

   
    function isSpokeAdmin(address _admin) external view  returns (bool) {
        return hasRole(SPOKE_ADMIN, _admin);
    }

     function addGatewayAdmin(address _admin) external  {
        grantRole(SPOKE_ADMIN, _admin);
    }

  
    function removeGatewayAdmin(address _admin) external  {
        revokeRole(SPOKE_ADMIN, _admin);
    }

   
    function isGatewayAdmin(address _admin) external view  returns (bool) {
        return hasRole(SPOKE_ADMIN, _admin);
    }

  
    function addEmergencyAdmin(address _admin) external  {
        grantRole(EMERGENCY_ADMIN, _admin);
    }

    function removeEmergencyAdmin(address _admin) external  {
        revokeRole(EMERGENCY_ADMIN, _admin);
    }

       function isEmergencyAdmin(
        address _admin
    ) external view  returns (bool) {
        return hasRole(EMERGENCY_ADMIN, _admin);
    }

   
    function addRiskAdmin(address _admin) external  {
        grantRole(RISK_ADMIN, _admin);
    }
    function removeRiskAdmin(address _admin) external  {
        revokeRole(RISK_ADMIN, _admin);
    }

    function isRiskAdmin(address _admin) external view  returns (bool) {
        return hasRole(RISK_ADMIN, _admin);
    }

    
      function addAssetListingAdmin(address _admin) external  {
        grantRole(ASSET_LISTING_ADMIN, _admin);
    }

 
    function removeAssetListingAdmin(address _admin) external  {
        revokeRole(ASSET_LISTING_ADMIN, _admin);
    }

    function isAssetListingAdmin(
        address _admin
    ) external view  returns (bool) {
        return hasRole(ASSET_LISTING_ADMIN, _admin);
    }



    function addChainListingAdmin(address _admin) external  {
        grantRole(CHAIN_LISTING_ADMIN, _admin);
    }

 
    function removeChainListingAdmin(address _admin) external  {
        revokeRole(CHAIN_LISTING_ADMIN, _admin);
    }

   
    function isChainListingAdmin(
        address _admin
    ) external view  returns (bool) {
        return hasRole(CHAIN_LISTING_ADMIN, _admin);
    }
}
