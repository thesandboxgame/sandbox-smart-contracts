// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {LibOrder} from "../lib-order/LibOrder.sol";

/// @title interface for the OrderValidator contract
/// @notice contains the signature for validate, isPurchaseValid and verifyERC20Whitelist functions
interface IOrderValidator {
    /// @notice verifies order
    /// @param order order to be validated
    /// @param signature signature of order
    /// @param sender order sender
    function validate(LibOrder.Order memory order, bytes memory signature, address sender) external view;
}
