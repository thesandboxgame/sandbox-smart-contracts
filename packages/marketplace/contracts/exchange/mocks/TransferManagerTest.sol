// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {TransferManager} from "../../transfer-manager/TransferManager.sol";
import {TransferExecutor} from "../../transfer-manager/TransferExecutor.sol";
import {LibDeal, LibPart, LibFeeSide} from "../../transfer-manager/lib/LibDeal.sol";
import {IRoyaltiesProvider} from "../../interfaces/IRoyaltiesProvider.sol";
import {LibOrderDataGeneric, LibOrderData, LibOrder} from "../libraries/LibOrderDataGeneric.sol";

contract TransferManagerTest is TransferManager, TransferExecutor {
    struct ProtocolFeeSide {
        LibFeeSide.FeeSide feeSide;
    }

    function init____(
        uint256 newProtocolFeePrimary,
        uint256 newProtocolFeeSecondary,
        address newCommunityWallet,
        IRoyaltiesProvider newRoyaltiesProvider
    ) external initializer {
        __Ownable_init();
        __TransferManager_init_unchained(
            newProtocolFeePrimary,
            newProtocolFeeSecondary,
            newCommunityWallet,
            newRoyaltiesProvider
        );
    }

    function getDealSide(
        LibOrder.Order memory order,
        LibOrderDataGeneric.GenericOrderData memory orderData
    ) internal pure returns (LibDeal.DealSide memory dealSide) {
        dealSide = LibDeal.DealSide(order.makeAsset, orderData.payouts, orderData.originFees, order.maker);
    }

    function getDealData(
        bytes4 makeMatchAssetClass,
        bytes4 takeMatchAssetClass,
        bytes4 leftDataType,
        bytes4 rightDataType,
        LibOrderDataGeneric.GenericOrderData memory leftOrderData,
        LibOrderDataGeneric.GenericOrderData memory rightOrderData
    ) internal pure returns (LibDeal.DealData memory dealData) {
        dealData.feeSide = LibFeeSide.getFeeSide(makeMatchAssetClass, takeMatchAssetClass);
        dealData.maxFeesBasePoint = getMaxFee(
            leftDataType,
            rightDataType,
            leftOrderData,
            rightOrderData,
            dealData.feeSide
        );
    }

    /**
        @notice determines the max amount of fees for the match
        @param dataTypeLeft data type of the left order
        @param dataTypeRight data type of the right order
        @param leftOrderData data of the left order
        @param rightOrderData data of the right order
        @param feeSide fee side of the match
        @return max fee amount in base points
    */
    function getMaxFee(
        bytes4 dataTypeLeft,
        bytes4 dataTypeRight,
        LibOrderDataGeneric.GenericOrderData memory leftOrderData,
        LibOrderDataGeneric.GenericOrderData memory rightOrderData,
        LibFeeSide.FeeSide feeSide
    ) internal pure returns (uint256) {
        if (
            dataTypeLeft != LibOrderData.SELL &&
            dataTypeRight != LibOrderData.SELL &&
            dataTypeLeft != LibOrderData.BUY &&
            dataTypeRight != LibOrderData.BUY
        ) {
            return 0;
        }

        uint256 matchFees = getSumFees(leftOrderData.originFees, rightOrderData.originFees);
        uint256 maxFee;
        if (feeSide == LibFeeSide.FeeSide.LEFT) {
            maxFee = rightOrderData.maxFeesBasePoint;
            require(dataTypeLeft == LibOrderData.BUY && dataTypeRight == LibOrderData.SELL, "wrong V3 type1");
        } else if (feeSide == LibFeeSide.FeeSide.RIGHT) {
            maxFee = leftOrderData.maxFeesBasePoint;
            require(dataTypeRight == LibOrderData.BUY && dataTypeLeft == LibOrderData.SELL, "wrong V3 type2");
        } else {
            return 0;
        }
        require(maxFee > 0 && maxFee >= matchFees && maxFee <= 1000, "wrong maxFee");

        return maxFee;
    }

    /**
        @notice calculates amount of fees for the match
        @param originLeft origin fees of the left order
        @param originRight origin fees of the right order
        @return sum of all fees for the match (protcolFee + leftOrder.originFees + rightOrder.originFees)
     */
    function getSumFees(
        LibPart.Part[] memory originLeft,
        LibPart.Part[] memory originRight
    ) internal pure returns (uint256) {
        uint256 result = 0;

        //adding left origin fees
        for (uint256 i; i < originLeft.length; i++) {
            result = result + originLeft[i].value;
        }

        //adding right origin fees
        for (uint256 i; i < originRight.length; i++) {
            result = result + originRight[i].value;
        }

        return result;
    }

    function doTransfersExternal(
        LibOrder.Order memory left,
        LibOrder.Order memory right
    ) external payable returns (uint256 totalLeftValue, uint256 totalRightValue) {
        LibOrderDataGeneric.GenericOrderData memory leftData = LibOrderDataGeneric.parse(left);
        LibOrderDataGeneric.GenericOrderData memory rightData = LibOrderDataGeneric.parse(right);

        return
            doTransfers(
                getDealSide(left, leftData),
                getDealSide(right, rightData),
                getDealData(
                    left.makeAsset.assetType.assetClass,
                    right.makeAsset.assetType.assetClass,
                    left.dataType,
                    right.dataType,
                    leftData,
                    rightData
                )
            );
    }
}
