// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import {IWhitelist} from "./interfaces/IWhitelist.sol";

/// @title Whitelist contract
/// @dev Controls which tokens are accepted in the marketplace.
contract Whitelist is IWhitelist, Initializable, AccessControlEnumerableUpgradeable {
    /// @notice Role for The Sandbox tokens
    /// @return Hash for TSB_ROLE
    bytes32 public constant TSB_ROLE = keccak256("TSB_ROLE");
    /// @notice Role for partner tokens
    /// @return Hash for PARTNER_ROLE
    bytes32 public constant PARTNER_ROLE = keccak256("PARTNER_ROLE");
    /// @notice Role for ERC20 tokens
    /// @return Hash for ERC20_ROLE
    bytes32 public constant ERC20_ROLE = keccak256("ERC20_ROLE");

    /// @dev Mapping for enableability of roles
    mapping(bytes32 => bool) private _rolesEnabled;

    /// @dev Boolean that indicates if whitelists are enabled or not
    bool private _whitelistsEnabled;

    /// @notice Event emitted when roles are enabled
    /// @param role Roles whose permissions were enabled
    event RoleEnabled(bytes32 indexed role);

    /// @notice Event emitted when roles are disabled
    /// @param role Roles whose permissions were disabled
    event RoleDisabled(bytes32 indexed role);

    /// @notice Event indicating that the market was open for all non-ERC20 tokens
    event WhitelistsEnabled();

    /// @notice Event indicating that the market was closed for all non-ERC20 tokens and must refer to whitelists
    event WhitelistsDisabled();

    /// @dev This protects the implementation contract from being initialized.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Setting permissions for tokens
    /// @param roles We want to enable or disable
    /// @param permissions Boolean
    function setRolesEnabled(
        bytes32[] calldata roles,
        bool[] calldata permissions
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setRolesEnabled(roles, permissions);
    }

    /// @notice Enable role
    /// @param role We want to enable
    function enableRole(bytes32 role) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _enableRole(role);
    }

    /// @notice Disable role
    /// @param role We want to disable
    function disableRole(bytes32 role) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _disableRole(role);
    }

    /// @notice Enable whitelists for all non ERC20 tokens
    function enableWhitelists() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _enableWhitelists();
    }

    /// @notice Disable whitelists
    function disableWhitelists() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _disableWhitelists();
    }

    /// @notice Check if a specific role is enabled or disabled.
    /// @param role The role identifier.
    /// @return True if the role is enabled, false if disabled.
    function isRoleEnabled(bytes32 role) public view returns (bool) {
        return _rolesEnabled[role];
    }

    /// @notice Check if whitelists are enabled.
    /// @return True if whitelists are enabled, false if disabled.
    function isWhitelistsEnabled() public view returns (bool) {
        return _whitelistsEnabled;
    }

    /// @notice Initializer for Whitelist
    /// @param admin Whitelist admin
    /// @param roles For different collections of assets
    /// @param permissions For different roles
    /// @param whitelistsEnabled If whitelists for assets are enabled or not
    // solhint-disable-next-line func-name-mixedcase
    function __Whitelist_init(
        address admin,
        bytes32[] calldata roles,
        bool[] calldata permissions,
        bool whitelistsEnabled
    ) internal onlyInitializing {
        __AccessControlEnumerable_init_unchained();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _setRolesEnabled(roles, permissions);
        if (whitelistsEnabled) {
            _enableWhitelists();
        } else {
            _disableWhitelists();
        }
    }

    /// @notice Enable or disable roles
    /// @param roles Identifiers
    /// @param permissions Booleans
    function _setRolesEnabled(bytes32[] memory roles, bool[] memory permissions) internal {
        require(roles.length == permissions.length, "ill-formed inputs");
        for (uint256 i = 0; i < roles.length; ++i) {
            if (isRoleEnabled(roles[i]) != permissions[i]) {
                if (permissions[i]) {
                    _enableRole(roles[i]);
                } else {
                    _disableRole(roles[i]);
                }
            }
        }
    }

    function _enableRole(bytes32 role) internal {
        _rolesEnabled[role] = true;
        emit RoleEnabled(role);
    }

    function _disableRole(bytes32 role) internal {
        _rolesEnabled[role] = false;
        emit RoleDisabled(role);
    }

    function _enableWhitelists() internal {
        _whitelistsEnabled = true;
        emit WhitelistsEnabled();
    }

    function _disableWhitelists() internal {
        _whitelistsEnabled = false;
        emit WhitelistsDisabled();
    }

    // slither-disable-next-line unused-state
    uint256[50] private __gap;
}
