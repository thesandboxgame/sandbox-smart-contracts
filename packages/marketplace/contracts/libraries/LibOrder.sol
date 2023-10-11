// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {LibAsset} from "./LibAsset.sol";
import {LibMath} from "./LibMath.sol";

/// @title library for Order
/// @notice contains structs and functions related to Order
library LibOrder {
    bytes32 internal constant ORDER_TYPEHASH =
        keccak256(
            "Order(address maker,Asset makeAsset,address taker,Asset takeAsset,uint256 salt,uint256 start,uint256 end)Asset(AssetType assetType,uint256 value)AssetType(uint256 assetClass,bytes data)"
        );

    struct Order {
        address maker;
        LibAsset.Asset makeAsset;
        address taker;
        LibAsset.Asset takeAsset;
        uint256 salt;
        uint256 start;
        uint256 end;
    }

    struct FillResult {
        uint256 leftValue;
        uint256 rightValue;
    }

    /// @notice calculate hash key from order
    /// @param order object to be hashed
    /// @return hash key of order
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

    /// @notice calculate hash from order
    /// @param order object to be hashed
    /// @return hash of order
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

    /// @notice validates order time
    /// @param order whose time we want to validate
    // solhint-disable not-rely-on-time
    // slither-disable-start timestamp
    function validateOrderTime(Order memory order) internal view {
        require(order.start == 0 || order.start < block.timestamp, "Order start validation failed");
        require(order.end == 0 || order.end > block.timestamp, "Order end validation failed");
    }

    // slither-disable-end timestamp
    // solhint-enable not-rely-on-time

    /// @notice Should return filled values
    /// @param leftOrder left order
    /// @param rightOrder right order
    /// @param leftOrderFill current fill of the left order (0 if order is unfilled)
    /// @param rightOrderFill current fill of the right order (0 if order is unfilled)
    /// @dev We have 3 cases, 1st: left order should be fully filled
    /// @dev 2nd: right order should be fully filled or 3d: both should be fully filled if required values are the same
    /// @return the fill result of both orders
    function fillOrder(
        LibOrder.Order calldata leftOrder,
        LibOrder.Order calldata rightOrder,
        uint256 leftOrderFill,
        uint256 rightOrderFill
    ) internal pure returns (FillResult memory) {
        (uint256 leftMakeValue, uint256 leftTakeValue) = calculateRemaining(leftOrder, leftOrderFill);
        (uint256 rightMakeValue, uint256 rightTakeValue) = calculateRemaining(rightOrder, rightOrderFill);

        if (rightTakeValue > leftMakeValue) {
            return fillLeft(leftMakeValue, leftTakeValue, rightOrder.makeAsset.value, rightOrder.takeAsset.value);
        }
        return fillRight(leftOrder.makeAsset.value, leftOrder.takeAsset.value, rightMakeValue, rightTakeValue);
    }

    /// @notice calculate the remaining fill from orders
    /// @param order order that we will calculate the remaining fill
    /// @param fill to be subtracted
    /// @return makeValue remaining fill from make side
    /// @return takeValue remaining fill from take side
    function calculateRemaining(
        LibOrder.Order calldata order,
        uint256 fill
    ) internal pure returns (uint256 makeValue, uint256 takeValue) {
        takeValue = order.takeAsset.value - fill;
        makeValue = LibMath.safeGetPartialAmountFloor(order.makeAsset.value, order.takeAsset.value, takeValue);
    }

    function fillRight(
        uint256 leftMakeValue,
        uint256 leftTakeValue,
        uint256 rightMakeValue,
        uint256 rightTakeValue
    ) internal pure returns (FillResult memory) {
        uint256 makerValue = LibMath.safeGetPartialAmountFloor(rightTakeValue, leftMakeValue, leftTakeValue);
        require(makerValue <= rightMakeValue, "fillRight: unable to fill");
        return FillResult(rightTakeValue, makerValue);
    }

    function fillLeft(
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
