//SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

/// @title Errors
/// @author The Sandbox
/// @notice Common errors
interface IErrors {
    /// @notice an address passed as argument is invalid
    error InvalidAddress();

    /// @notice an argument passed is invalid
    error InvalidArgument();

    /// @notice an array argument has an invalid length
    error InvalidLength();

    /// @notice only admin can call this function
    error OnlyAdmin();

    /// @notice when calling onERC721BatchReceived callback the target contract rejected the call
    /// @param receiver the receiving contract
    error ERC721InvalidBatchReceiver(address receiver);
}
