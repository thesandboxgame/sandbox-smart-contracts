// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

/// @title interface for the WhiteList contract
/// @notice contains the signature for the contract function
interface IWhitelist {
    /// @notice Check if a specific role is enabled or disabled.
    /// @param role The role identifier.
    /// @return true if the role is enabled, false if disabled.
    function isRoleEnabled(bytes32 role) external view returns (bool);

    /// @notice Check if whitelists are enabled.
    /// @return True if whitelists are enabled, false if disabled.
    function isWhitelistsEnabled() external view returns (bool);

    /// @notice setting permissions for tokens
    /// @param roles we want to enable or disable
    /// @param permissions boolan
    function setRolesEnabled(bytes32[] calldata roles, bool[] calldata permissions) external;

    /// notice Enable whitelists, allowing orders with any token except for ERC20 tokens.
    function enableWhitelists() external;

    /// @notice Disable whitelists, requiring orders to refer to the specified whitelists.
    function disableWhitelists() external;
}
