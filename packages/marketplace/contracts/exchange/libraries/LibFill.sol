// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import {LibOrder} from "../../libraries/LibOrder.sol";
import {LibMath} from "./LibMath.sol";

/// @title This library provides `fillOrder` function.
/// @notice It calculates fill of both orders (part of the Order that can be filled).
library LibFill {
    struct FillResult {
        uint256 leftValue;
        uint256 rightValue;
    }

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
    ) internal pure returns (FillResult memory result) {
        uint256 makerValue = LibMath.safeGetPartialAmountFloor(rightTakeValue, leftMakeValue, leftTakeValue);
        require(makerValue <= rightMakeValue, "fillRight: unable to fill");
        return FillResult(rightTakeValue, makerValue);
    }

    function fillLeft(
        uint256 leftMakeValue,
        uint256 leftTakeValue,
        uint256 rightMakeValue,
        uint256 rightTakeValue
    ) internal pure returns (FillResult memory result) {
        uint256 rightTake = LibMath.safeGetPartialAmountFloor(leftTakeValue, rightMakeValue, rightTakeValue);
        require(rightTake <= leftMakeValue, "fillLeft: unable to fill");
        return FillResult(leftMakeValue, leftTakeValue);
    }
}
