// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {LibOrder} from "../lib-order/LibOrder.sol";
import {LibFill} from "../exchange/libraries/LibFill.sol";

contract LibFillTest {
    function fillOrder(
        LibOrder.Order calldata leftOrder,
        LibOrder.Order calldata rightOrder,
        uint256 leftOrderFill,
        uint256 rightOrderFill
    ) external pure returns (LibFill.FillResult memory) {
        return LibFill.fillOrder(leftOrder, rightOrder, leftOrderFill, rightOrderFill);
    }

    function calculateRemaining(
        LibOrder.Order calldata order,
        uint256 fill
    ) external pure returns (uint256 makeAmount, uint256 takeAmount) {
        return LibFill.calculateRemaining(order, fill);
    }
}
