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

    mapping(bytes32 => bool) private roleEnabled;

    bool private whitelistsEnabled;

    /// @notice event emitted when roles are enabled
    /// @param roles roles whose permissions were enabled
    event RoleEnabled(bytes32[] roles);

    /// @notice event emitted when roles are disabled
    /// @param roles roles whose permissions were disabled
    event RoleDisabled(bytes32[] roles);

    /// @notice event indicating that the market was open for all non ERC20 tokens
    event Opened();

    /// @notice event indicating that the market was closed for all non ERC20 tokens, and must refer to whitelists
    event Closed();

    /// @param permission boolean indicating that all tokens are accepted
    event NewOpenSet(bool permission);

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
    /// @param newOpen allows orders with any token */
    // solhint-disable-next-line func-name-mixedcase
    function __Whitelist_init(
        address admin,
        bytes32[] calldata roles,
        bool[] calldata permissions,
        bool whitelistEnabler
    ) internal onlyInitializing {
        __AccessControlEnumerable_init_unchained();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _setRolePermission(roles, permissions);
        _setWhitelistEnabler(whitelistEnabler);
    }

    /// @notice setting permissions for tokens
    /// @param roles we want to enable or disable
    /// @param permissions boolan
    function setPermissions(
        bytes32[] calldata roles,
        bool[] calldata permissions
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setRolePermission(roles, permissions);
    }

    /// @notice open market place for all non ERC20 tokens
    function enableWhitelists() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setWhitelistEnabler(true);
    }

    /// @notice setting permissions for open
    function disableWhitelists() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setWhitelistEnabler(false);
    }

    function getRoleEnabler(bytes32 role) internal view returns (bool) {
        return roleEnabled[role];
    }

    function getWhitelistsEnabled() internal view returns (bool) {
        return whitelistsEnabled;
    }

    /// @notice setting permissions for tokens
    /// @param roles identifyers
    /// @param permissions booleans
    function _setRolePermission(bytes32[] memory roles, bool[] memory permissions) internal {
        bytes32[] memory enabled;
        bytes32[] memory disabled;
        for (uint256 i = 0; i < roles.length; ++i) {
            roleEnabled[roles[i]] = permissions[i];
            if (permissions[i]) {
                enabled[enabled.length] = roles[i];
            } else {
                disabled[disabled.length] = roles[i];
            }
        }
        if (enabled.length > 0) {
            emit RoleEnabled(enabled);
        }
        if (disabled.length > 0) {
            emit RoleDisabled(disabled);
        }
    }

    function _setWhitelistEnabler(bool status) internal {
        whitelistsEnabled = status;
        if (status) {
            emit Opened();
        } else emit Closed();
    }
}
