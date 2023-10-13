// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import {IWhitelist} from "./interfaces/IWhitelist.sol";

/// @title WhiteList contract
/// @dev controls which tokens are accepted in the marketplace
contract Whitelist is IWhitelist, Initializable, AccessControlEnumerableUpgradeable {
    /// @notice role for The Sandbox tokens
    /// @return hash for TSB_ROLE
    bytes32 public constant TSB_ROLE = keccak256("TSB_ROLE");
    /// @notice role for partner tokens
    /// @return hash for PARTNER_ROLE
    bytes32 public constant PARTNER_ROLE = keccak256("PARTNER_ROLE");
    /// @notice role for ERC20 tokens
    /// @return hash for ERC20_ROLE
    bytes32 public constant ERC20_ROLE = keccak256("ERC20_ROLE");

    /// @dev map for enableability of roles
    mapping(bytes32 => bool) private _rolesEnabled;

    /// @dev boolean that indicates if whitelists are enabled or not
    bool private _whitelistsEnabled;

    /// @notice event emitted when roles are enabled XXX
    /// @param role roles whose permissions were enabled
    event RoleEnabled(bytes32 indexed role);

    /// @notice event emitted when roles are disabled XXX
    /// @param role roles whose permissions were disabled
    event RoleDisabled(bytes32 indexed role);

    /// @notice event indicating that the market was open for all non ERC20 tokens
    event WhitelistsEnabled();

    /// @notice event indicating that the market was closed for all non ERC20 tokens, and must refer to whitelists
    event WhitelistsDisabled();

    /// @dev this protects the implementation contract from being initialized.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /* /// @notice initializer for WhiteList
    /// @param admin whitelist admin
    /// @param newTsbPermission allows orders with The Sandbox token
    /// @param newPartnersPermission allows orders with partner token
    /// @param newErc20Permission allows to pay orders with only whitelisted token
    /// @param whitelistsEnabled allows orders with any token */
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

    /// @notice setting permissions for tokens
    /// @param roles we want to enable or disable
    /// @param permissions boolan
    function setRolesEnabled(
        bytes32[] calldata roles,
        bool[] calldata permissions
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setRolesEnabled(roles, permissions);
    }

    /// @notice open market place for all non ERC20 tokens
    function enableWhitelists() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _enableWhitelists();
    }

    /// @notice setting permissions for open
    function disableWhitelists() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _disableWhitelists();
    }

    /// @notice Check if a specific role is enabled or disabled.
    /// @param role The role identifier.
    /// @return true if the role is enabled, false if disabled.
    function isRoleEnabled(bytes32 role) public view returns (bool) {
        return _rolesEnabled[role];
    }

    /// @notice Check if whitelists are enabled.
    /// @return True if whitelists are enabled, false if disabled.
    function isWhitelistsEnabled() public view returns (bool) {
        return _whitelistsEnabled;
    }

    /// @notice setting permissions for tokens
    /// @param roles identifyers
    /// @param permissions booleans
    function _setRolesEnabled(bytes32[] memory roles, bool[] memory permissions) internal {
        for (uint256 i = 0; i < roles.length; ++i) {
            if (_rolesEnabled[roles[i]] != permissions[i]) {
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
}
