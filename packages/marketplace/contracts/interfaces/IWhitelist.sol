// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/// @author The Sandbox
/// @title Interface for the Whitelist contract
/// @notice Contains the function signatures for the contract.
interface IWhitelist {
    /// @notice Check if a specific role is enabled or disabled.
    /// @param role The role identifier.
    /// @return True if the role is enabled, false if disabled.
    function isRoleEnabled(bytes32 role) external view returns (bool);

    /// @notice Check if whitelists are enabled.
    /// @return True if whitelists are enabled, false if disabled.
    function isWhitelistsEnabled() external view returns (bool);

    /// @notice Setting permissions for tokens.
    /// @param roles Roles we want to enable or disable.
    /// @param permissions Boolean.
    function setRolesEnabled(bytes32[] calldata roles, bool[] calldata permissions) external;

    /// @notice Enable role.
    /// @param role Role we want to enable.
    function enableRole(bytes32 role) external;

    /// @notice Disable role.
    /// @param role Role we want to disable.
    function disableRole(bytes32 role) external;

    /// @notice Enable whitelists, allowing orders with any token except for ERC20 tokens.
    function enableWhitelists() external;

    /// @notice Disable whitelists, requiring orders to refer to the specified whitelists.
    function disableWhitelists() external;
}
