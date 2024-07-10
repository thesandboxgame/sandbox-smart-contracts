//SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

/// @title Errors
/// @author The Sandbox
/// @custom:security-contact contact-blockchain@sandbox.game
/// @notice Common errors
interface IErrors {
    /// @notice Error for overflow conditions
    error Overflow();

    /// @notice Error for unauthorized access
    error NotAuthorized();

    /// @notice Error for invalid sender
    error InvalidSender();

    /// @notice Error for invalid amount
    error InvalidAmount();

    /// @notice Error for invalid owner or spender
    error InvalidOwnerOrSpender();

    /// @notice Error for mismatched first parameter and sender address
    error FirstParamNotSender();

    /// @notice Error for failed calls, containing the error message
    /// @param message error message returned from the failed call
    error CallFailed(string message);

    /// @notice Error for admin-only access
    error OnlyAdmin();
}
