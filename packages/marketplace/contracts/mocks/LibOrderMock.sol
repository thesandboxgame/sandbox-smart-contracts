// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {LibOrder} from "../libraries/LibOrder.sol";

contract LibOrderMock {
    function fillOrder(
        LibOrder.Order calldata leftOrder,
        LibOrder.Order calldata rightOrder,
        uint256 leftOrderFill,
        uint256 rightOrderFill
    ) external pure returns (LibOrder.FillResult memory) {
        return LibOrder.fillOrder(leftOrder, rightOrder, leftOrderFill, rightOrderFill);
    }

    function calculateRemaining(
        LibOrder.Order calldata order,
        uint256 fill
    ) external pure returns (uint256 makeAmount, uint256 takeAmount) {
        return LibOrder.calculateRemaining(order, fill);
    }
}
