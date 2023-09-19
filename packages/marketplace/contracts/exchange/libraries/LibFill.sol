// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import {LibOrder, LibMath} from "../../lib-order/LibOrder.sol";

/// @title This library provides `fillOrder` function.
/// @notice It calculates fill of both orders (part of the Order that can be filled).
library LibFill {
    struct FillResult {
        uint256 leftValue;
        uint256 rightValue;
    }

    struct IsMakeFill {
        bool leftMake;
        bool rightMake;
    }

    /// @notice Should return filled values
    /// @param leftOrder left order
    /// @param rightOrder right order
    /// @param leftOrderFill current fill of the left order (0 if order is unfilled)
    /// @param rightOrderFill current fill of the right order (0 if order is unfilled)
    /// @param leftIsMakeFill true if left orders fill is calculated from the make side, false if from the take side
    /// @param rightIsMakeFill true if right orders fill is calculated from the make side, false if from the take side
    /// @dev We have 3 cases, 1st: left order should be fully filled
    /// @dev 2nd: right order should be fully filled or 3d: both should be fully filled if required values are the same
    /// @return the fill result of both orders
    function fillOrder(
        LibOrder.Order memory leftOrder,
        LibOrder.Order memory rightOrder,
        uint256 leftOrderFill,
        uint256 rightOrderFill,
        bool leftIsMakeFill,
        bool rightIsMakeFill
    ) internal pure returns (FillResult memory) {
        (uint256 leftMakeValue, uint256 leftTakeValue) = LibOrder.calculateRemaining(
            leftOrder,
            leftOrderFill,
            leftIsMakeFill
        );
        (uint256 rightMakeValue, uint256 rightTakeValue) = LibOrder.calculateRemaining(
            rightOrder,
            rightOrderFill,
            rightIsMakeFill
        );

        if (rightTakeValue > leftMakeValue) {
            return fillLeft(leftMakeValue, leftTakeValue, rightOrder.makeAsset.value, rightOrder.takeAsset.value);
        }
        return fillRight(leftOrder.makeAsset.value, leftOrder.takeAsset.value, rightMakeValue, rightTakeValue);
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
