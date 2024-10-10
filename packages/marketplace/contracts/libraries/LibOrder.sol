// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {LibAsset} from "./LibAsset.sol";
import {LibMath} from "./LibMath.sol";

/// @author The Sandbox
/// @title Order Handling Library
/// @notice Provides tools for constructing, hashing, and validating orders.
library LibOrder {
    bytes32 internal constant ORDER_TYPEHASH =
        keccak256(
            "Order(address maker,Asset makeAsset,address taker,Asset takeAsset,uint256 salt,uint256 start,uint256 end)Asset(AssetType assetType,uint256 value)AssetType(uint256 assetClass,bytes data)"
        );

    /// @dev Represents the structure of an order.
    struct Order {
        address maker; // Address of the maker.
        LibAsset.Asset makeAsset; // Asset the maker is providing.
        address taker; // Address of the taker.
        LibAsset.Asset takeAsset; // Asset the taker is providing.
        uint256 salt; // Random number to ensure unique order hash.
        uint256 start; // Timestamp when the order becomes valid.
        uint256 end; // Timestamp when the order expires.
    }

    /// @dev Represents the result of filling two orders.
    struct FillResult {
        uint256 leftValue; // Amount filled from the left order.
        uint256 rightValue; // Amount filled from the right order.
    }

    /// @notice Computes the unique hash of an order.
    /// @param order The order data.
    /// @return The unique hash of the order.
    function hashKey(Order calldata order) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    order.maker,
                    LibAsset.hash(order.makeAsset.assetType),
                    LibAsset.hash(order.takeAsset.assetType),
                    order.salt
                )
            );
    }

    /// @notice Computes the complete hash of an order, including domain-specific data.
    /// @param order The order data.
    /// @return The complete hash of the order.
    function hash(Order calldata order) internal pure returns (bytes32) {
        return
            keccak256(
                // solhint-disable-next-line func-named-parameters
                abi.encode(
                    ORDER_TYPEHASH,
                    order.maker,
                    LibAsset.hash(order.makeAsset),
                    order.taker,
                    LibAsset.hash(order.takeAsset),
                    order.salt,
                    order.start,
                    order.end
                )
            );
    }

    /// @notice Validates order time
    /// @param order Whose time we want to validate
    // solhint-disable not-rely-on-time
    // slither-disable-start timestamp
    function validateOrderTime(Order memory order) internal view {
        require(order.start == 0 || order.start < block.timestamp, "Order start validation failed");
        require(order.end == 0 || order.end > block.timestamp, "Order end validation failed");
    }

    // slither-disable-end timestamp
    // solhint-enable not-rely-on-time

    /// @notice Should return filled values
    /// @param leftOrder Left order
    /// @param rightOrder Right order
    /// @param leftOrderFill Current fill of the left order (0 if order is unfilled)
    /// @param rightOrderFill Current fill of the right order (0 if order is unfilled)
    /// @dev We have 3 cases, 1st: left order should be fully filled
    /// @dev 2nd: right order should be fully filled or 3d: both should be fully filled if required values are the same
    /// @return The fill result of both orders
    function fillOrder(
        LibOrder.Order calldata leftOrder,
        LibOrder.Order calldata rightOrder,
        uint256 leftOrderFill,
        uint256 rightOrderFill
    ) internal pure returns (FillResult memory) {
        (uint256 leftMakeValue, uint256 leftTakeValue) = calculateRemaining(leftOrder, leftOrderFill);
        (uint256 rightMakeValue, uint256 rightTakeValue) = calculateRemaining(rightOrder, rightOrderFill);

        if (rightTakeValue > leftMakeValue) {
            return _fillLeft(leftMakeValue, leftTakeValue, rightOrder.makeAsset.value, rightOrder.takeAsset.value);
        }
        return _fillRight(leftOrder.makeAsset.value, leftOrder.takeAsset.value, rightMakeValue, rightTakeValue);
    }

    /// @notice Computes the remaining fillable amount of an order.
    /// @param order The order to compute from.
    /// @param fill The amount of the order already filled.
    /// @return makeValue The remaining fillable amount from the maker's side.
    /// @return takeValue The remaining fillable amount from the taker's side.
    function calculateRemaining(
        LibOrder.Order calldata order,
        uint256 fill
    ) internal pure returns (uint256 makeValue, uint256 takeValue) {
        require(order.takeAsset.value >= fill, "filling more than order permits");
        takeValue = order.takeAsset.value - fill;
        makeValue = LibMath.safeGetPartialAmountFloor(order.makeAsset.value, order.takeAsset.value, takeValue);
    }

    /// @notice Computes the fill values for a situation where the right order is expected to fill the left order.
    /// @param leftMakeValue The amount the left order maker wants to trade.
    /// @param leftTakeValue The amount the left order taker wants in return.
    /// @param rightMakeValue The amount the right order maker wants to trade.
    /// @param rightTakeValue The amount the right order taker wants in return.
    /// @return The filled amounts for both the left and right orders.
    function _fillRight(
        uint256 leftMakeValue,
        uint256 leftTakeValue,
        uint256 rightMakeValue,
        uint256 rightTakeValue
    ) internal pure returns (FillResult memory) {
        uint256 makerValue = LibMath.safeGetPartialAmountFloor(rightTakeValue, leftMakeValue, leftTakeValue);
        require(makerValue <= rightMakeValue, "fillRight: unable to fill");
        return FillResult(rightTakeValue, makerValue);
    }

    /// @notice Computes the fill values for a situation where the left order is expected to fill the right order.
    /// @param leftMakeValue The amount the left order maker wants to trade.
    /// @param leftTakeValue The amount the left order taker wants in return.
    /// @param rightMakeValue The amount the right order maker wants to trade.
    /// @param rightTakeValue The amount the right order taker wants in return.
    /// @return The filled amounts for both the left and right orders.
    function _fillLeft(
        uint256 leftMakeValue,
        uint256 leftTakeValue,
        uint256 rightMakeValue,
        uint256 rightTakeValue
    ) internal pure returns (FillResult memory) {
        uint256 rightTake = LibMath.safeGetPartialAmountFloor(leftTakeValue, rightMakeValue, rightTakeValue);
        require(rightTake <= leftMakeValue, "fillLeft: unable to fill");
        return FillResult(leftMakeValue, leftTakeValue);
    }
}
