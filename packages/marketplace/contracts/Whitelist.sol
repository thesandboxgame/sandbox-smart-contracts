// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import {IWhitelist} from "./interfaces/IWhitelist.sol";

/// @author The Sandbox
/// @title Whitelist contract
/// @dev A contract to control which tokens are accepted in the marketplace.
contract Whitelist is IWhitelist, Initializable, AccessControlEnumerableUpgradeable {
    /// @notice Role for The Sandbox tokens
    /// @return Hash for TSB_ROLE
    bytes32 public constant TSB_ROLE = keccak256("TSB_ROLE");
    /// @notice Role for partner tokens
    /// @return Hash for PARTNER_ROLE
    bytes32 public constant PARTNER_ROLE = keccak256("PARTNER_ROLE");
    /// @notice Role for ERC20 tokens, enabled all times
    /// @return Hash for ERC20_ROLE
    bytes32 public constant ERC20_ROLE = keccak256("ERC20_ROLE");

    /// @dev Internal mapping to keep track of the enablement status of each role.
    mapping(bytes32 role => bool isEnabled) private _rolesEnabled;

    /// @dev Boolean that indicates if non-ERC20 whitelists are enabled or not
    bool private _whitelistsEnabled;

    /// @notice Emitted when a specific role gets enabled.
    /// @param role Roles whose permissions were enabled
    event RoleEnabled(bytes32 indexed role);

    /// @notice Emitted when a specific role gets disabled.
    event RoleDisabled(bytes32 indexed role);

    /// @notice Emitted when only non-ERC20 tokens that are whitelisted can be allowed.
    event WhitelistsEnabled();

    /// @notice Emitted when all non-ERC20 tokens are allowed in the market.
    event WhitelistsDisabled();

    /// @dev This protects the implementation contract from being initialized.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Enables or disables specific roles.
    /// @param roles List of role identifiers.
    /// @param permissions List of booleans indicating the desired status of each role.
    function setRolesEnabled(
        bytes32[] calldata roles,
        bool[] calldata permissions
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setRolesEnabled(roles, permissions);
    }

    /// @notice Enable a given role.
    /// @param role Identifier of the role to be enabled.
    function enableRole(bytes32 role) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _enableRole(role);
    }

    /// @notice Disable a given role.
    /// @param role Identifier of the role to be disabled.
    function disableRole(bytes32 role) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _disableRole(role);
    }

    /// @notice Activate whitelists for all non-ERC20 tokens.
    function enableWhitelists() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _enableWhitelists();
    }

    /// @notice Deactivate whitelists for all non-ERC20 tokens.
    function disableWhitelists() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _disableWhitelists();
    }

    /// @notice Query the status of a given role.
    /// @param role Identifier of the role.
    /// @return True if the role is enabled, false otherwise.
    function isRoleEnabled(bytes32 role) public view returns (bool) {
        return _rolesEnabled[role];
    }

    /// @notice Check the status of the whitelist functionality.
    /// @return True if whitelists are active, false otherwise.
    function isWhitelistsEnabled() public view returns (bool) {
        return _whitelistsEnabled;
    }

    /// @notice Initializer function for the Whitelist contract.
    /// @param admin Address to be granted the admin role.
    /// @param roles List of role identifiers.
    /// @param permissions List of booleans for the initial status of each role.
    /// @param whitelistsEnabled Initial status of the whitelist functionality.
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

    /// @dev Internal function to set the status of multiple roles.
    /// @param roles List of role identifiers.
    /// @param permissions List of desired status for each role.
    function _setRolesEnabled(bytes32[] memory roles, bool[] memory permissions) internal {
        require(roles.length == permissions.length, "Mismatched input lengths");
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

    /// @dev Internal function to activate a role.
    /// @param role Identifier of the role to be enabled.
    function _enableRole(bytes32 role) internal {
        _rolesEnabled[role] = true;
        emit RoleEnabled(role);
    }

    /// @dev Internal function to deactivate a role.
    /// @param role Identifier of the role to be disabled.
    function _disableRole(bytes32 role) internal {
        _rolesEnabled[role] = false;
        emit RoleDisabled(role);
    }

    /// @dev Internal function to activate the whitelist functionality.
    function _enableWhitelists() internal {
        _whitelistsEnabled = true;
        emit WhitelistsEnabled();
    }

    /// @dev Internal function to deactivate the whitelist functionality.
    function _disableWhitelists() internal {
        _whitelistsEnabled = false;
        emit WhitelistsDisabled();
    }

    // slither-disable-next-line unused-state
    uint256[50] private __gap;
}
