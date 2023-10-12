// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";

/// @title WhiteList contract
/// @dev controls which tokens are accepted in the marketplace
contract WhiteList is Initializable, AccessControlEnumerableUpgradeable {
    /// @notice role for The Sandbox tokens
    /// @return hash for TSB_ROLE
    bytes32 public constant TSB_ROLE = keccak256("TSB_ROLE");
    /// @notice role for partner tokens
    /// @return hash for PARTNER_ROLE
    bytes32 public constant PARTNER_ROLE = keccak256("PARTNER_ROLE");
    /// @notice role for ERC20 tokens
    /// @return hash for ERC20_ROLE
    bytes32 public constant ERC20_ROLE = keccak256("ERC20_ROLE");

    mapping(bytes32 => bool) public roleEnabled;

    bool public open;

    /// @notice event emitted when new permissions for roles are changed
    /// @param role role whose permission was changed
    /// @param permission new permission of role
    event PermissionSet(bytes32 role, bool permission);

    /// @param permission boolean indicating that all tokens are accepted
    event NewOpenSet(bool permission);

    /// @dev this protects the implementation contract from being initialized.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice initializer for WhiteList
    /// @param admin whitelist admin
    /// @param newTsbPermission allows orders with The Sandbox token
    /// @param newPartnersPermission allows orders with partner token
    /// @param newErc20Permission allows to pay orders with only whitelisted token
    /// @param newOpen allows orders with any token
    // solhint-disable-next-line func-name-mixedcase
    function __Whitelist_init(
        address admin,
        bool newTsbPermission,
        bool newPartnersPermission,
        bool newErc20Permission,
        bool newOpen
    ) internal onlyInitializing {
        __AccessControlEnumerable_init_unchained();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _setRolePermission(TSB_ROLE, newTsbPermission);
        _setRolePermission(PARTNER_ROLE, newPartnersPermission);
        _setRolePermission(ERC20_ROLE, newErc20Permission);
        _setOpen(newOpen);
    }

    /// @notice setting permissions for tokens
    /// @param role we want to enable or disable
    /// @param permission boolan
    function setPermissions(bytes32 role, bool permission) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setRolePermission(role, permission);
    }

    /// @notice setting permissions for open
    /// @param permission boolan
    function setOpen(bool permission) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setOpen(permission);
    }

    /// @notice setting permissions for tokens
    /// @param role identifyer
    /// @param permission boolean
    function _setRolePermission(bytes32 role, bool permission) internal {
        roleEnabled[role] = permission;
        emit PermissionSet(role, permission);
    }

    function _setOpen(bool permission) internal {
        open = permission;
        emit NewOpenSet(permission);
    }
}
