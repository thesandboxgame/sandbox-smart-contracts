// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {LibOrder} from "../libraries/LibOrder.sol";

/// @author The Sandbox
/// @title OrderValidator contract interface
/// @notice Contains the signature for validate, isPurchaseValid and verifyERC20Whitelist functions
interface IOrderValidator {
    /// @notice Verifies order
    /// @param order Order to be validated
    /// @param signature Signature of order
    /// @param sender Order sender
    function validate(LibOrder.Order memory order, bytes memory signature, address sender) external view;

    /// @notice Check if the contract supports an interface
    /// @param interfaceId The id of the interface
    /// @return true if the interface is supported
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}
