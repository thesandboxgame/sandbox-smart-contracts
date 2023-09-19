// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {LibOrder} from "../../lib-order/LibOrder.sol";
import {LibOrderData} from "../../lib-order/LibOrderData.sol";
import {LibPart} from "../../lib-part/LibPart.sol";

library LibOrderDataGeneric {
    struct GenericOrderData {
        LibPart.Part[] payouts;
        LibPart.Part[] originFees;
        bool isMakeFill;
        uint256 maxFeesBasePoint;
    }

    function parse(LibOrder.Order memory order) internal pure returns (GenericOrderData memory dataOrder) {
        if (order.dataType == LibOrderData.SELL) {
            LibOrderData.DataSell memory data = abi.decode(order.data, (LibOrderData.DataSell));
            dataOrder.payouts = parsePayouts(data.payouts);
            dataOrder.originFees = parseOriginFeeData(data.originFeeFirst, data.originFeeSecond);
            dataOrder.isMakeFill = true;
            dataOrder.maxFeesBasePoint = data.maxFeesBasePoint;
        } else if (order.dataType == LibOrderData.BUY) {
            LibOrderData.DataBuy memory data = abi.decode(order.data, (LibOrderData.DataBuy));
            dataOrder.payouts = parsePayouts(data.payouts);
            dataOrder.originFees = parseOriginFeeData(data.originFeeFirst, data.originFeeSecond);
            dataOrder.isMakeFill = false;
            // solhint-disable-next-line no-empty-blocks
        } else if (order.dataType == 0xffffffff) {} else {
            revert("Unknown Order data type");
        }
        if (dataOrder.payouts.length == 0) {
            dataOrder.payouts = payoutSet(order.maker);
        }
    }

    function payoutSet(address orderAddress) internal pure returns (LibPart.Part[] memory) {
        LibPart.Part[] memory payout = new LibPart.Part[](1);
        payout[0].account = payable(orderAddress);
        payout[0].value = 10000;
        return payout;
    }

    function parseOriginFeeData(uint256 dataFirst, uint256 dataSecond) internal pure returns (LibPart.Part[] memory) {
        LibPart.Part[] memory originFee;

        if (dataFirst > 0 && dataSecond > 0) {
            originFee = new LibPart.Part[](2);

            originFee[0] = uintToLibPart(dataFirst);
            originFee[1] = uintToLibPart(dataSecond);
        }

        if (dataFirst > 0 && dataSecond == 0) {
            originFee = new LibPart.Part[](1);

            originFee[0] = uintToLibPart(dataFirst);
        }

        if (dataFirst == 0 && dataSecond > 0) {
            originFee = new LibPart.Part[](1);

            originFee[0] = uintToLibPart(dataSecond);
        }

        return originFee;
    }

    function parsePayouts(uint256 data) internal pure returns (LibPart.Part[] memory) {
        LibPart.Part[] memory payouts;

        if (data > 0) {
            payouts = new LibPart.Part[](1);
            payouts[0] = uintToLibPart(data);
        }

        return payouts;
    }

    /**
        @notice converts uint256 to LibPart.Part
        @param data address and value encoded in uint256 (first 12 bytes )
        @return result LibPart.Part 
     */
    function uintToLibPart(uint256 data) internal pure returns (LibPart.Part memory result) {
        if (data > 0) {
            result.account = payable(address(uint160(data)));
            result.value = uint96(data >> 160);
        }
    }
}
