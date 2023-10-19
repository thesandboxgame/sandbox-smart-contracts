// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {LibOrder} from "../libraries/LibOrder.sol";

/// @title OrderValidator contract interface
/// @notice Contains the signature for validate, isPurchaseValid and verifyERC20Whitelist functions
interface IOrderValidator {
    /// @notice Verifies order
    /// @param order Order to be validated
    /// @param signature Signature of order
    /// @param sender Order sender
    function validate(LibOrder.Order memory order, bytes memory signature, address sender) external view;
}
