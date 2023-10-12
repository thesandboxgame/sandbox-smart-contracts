// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import {IWhiteList} from "./interfaces/IWhiteList.sol";
import {LibAsset} from "./libraries/LibAsset.sol";

/// @title WhiteList contract
/// @dev controls which tokens are accepted in the marketplace
contract WhiteList is Initializable, IWhiteList, AccessControlEnumerableUpgradeable {
    /// @notice role for The Sandbox tokens
    /// @return hash for TSB_ROLE
    bytes32 public constant TSB_ROLE = keccak256("TSB_ROLE");
    /// @notice role for partner tokens
    /// @return hash for PARTNER_ROLE
    bytes32 public constant PARTNER_ROLE = keccak256("PARTNER_ROLE");
    /// @notice role for ERC20 tokens
    /// @return hash for ERC20_ROLE
    bytes32 public constant ERC20_ROLE = keccak256("ERC20_ROLE");

    /// @notice if status == open, then no whitelist [no mapping needed].
    /// @return open
    bool public open;

    mapping(bytes32 => bool) enabled;
    mapping(LibAsset.AssetClassType => bytes32[]) roles;

    /// @notice event emitted when new permissions for tokens are added
    /// @param tsbOnly boolean indicating that TSB tokens are accepted
    /// @param partners boolean indicating that partner tokens are accepted
    /// @param open boolean indicating that all tokens are accepted
    /// @param erc20List boolean indicating that there is a restriction for ERC20 tokens
    event PermissionSet(bool tsbOnly, bool partners, bool open, bool erc20List);

    /// @dev this protects the implementation contract from being initialized.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice initializer for WhiteList
    /// @param admin whitelist admin
    /// @param newTsbOnly allows orders with The Sandbox token
    /// @param newPartners allows orders with partner token
    /// @param newOpen allows orders with any token
    /// @param newErc20List allows to pay orders with only whitelisted token
    // solhint-disable-next-line func-name-mixedcase
    function __Whitelist_init(
        address admin,
        bool newTsbOnly,
        bool newPartners,
        bool newOpen,
        bool newErc20List
    ) internal onlyInitializing {
        __AccessControlEnumerable_init_unchained();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        bytes32[] memory roleArray = new bytes32[](1);
        roleArray[0] = ERC20_ROLE;
        _setRolesForAssetClassType(LibAsset.AssetClassType.ERC20_ASSET_CLASS, roleArray);
    }

    function setRoleToken(LibAsset.Asset calldata asset, bytes32 role) external {
        address token = abi.decode(asset.assetType.data, (address));
        require((roles[asset.assetType.assetClass].length > 0), "type of asset not yet set");
        bytes32[] memory listOfRoles = roles[asset.assetType.assetClass];
        for (uint256 i; i < listOfRoles.length; i++) {
            if (listOfRoles[i] == role) {
                grantRole(role, token);
                return;
            }
        }
        revert("role not registered");
    }

    function setRoleToken(LibAsset.AssetClassType classType, bytes32[] calldata newRoles) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setRolesForAssetClassType(classType, newRoles);
    }

    function setRoleStatus(bytes32 role, bool status) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setRoleStatus(role, status);
    }

    function setOpen(bool status) external {
        open = status;
    }

    function _setRolesForAssetClassType(LibAsset.AssetClassType classType, bytes32[] memory newRoles) internal {
        roles[classType] = newRoles;
    }

    function _setRoleStatus(bytes32 role, bool newStatus) internal {
        enabled[role] = newStatus;
    }

    function _setAccessControlStatus(bool newStatus) internal {
        open = newStatus;
    }

    function verify(LibAsset.Asset calldata asset) internal view {
        if (open) {
            return;
        } else {
            //get roles associated to asset, verify is has role
            address token = abi.decode(asset.assetType.data, (address));
            bytes32[] memory listOfRoles = roles[asset.assetType.assetClass];
            for (uint256 i; i < listOfRoles.length; i++) {
                if (hasRole(listOfRoles[i], token)) {
                    return;
                }
            }
            revert("not allowed");
        }
    }

    /* function checkAsset(LibAsset.AssetClassType classType, address account) {      
        result = true;
        for (uint256 i = 0; i < roles.length; i++) {
            if (enabled[roles[i]]) {
                result = false;

                if (hasRole(roles[i], account)) {
                    return true;
                }
            }
        }
        return result;
    } */

    //open
}
