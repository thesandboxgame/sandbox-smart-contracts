// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {LibAsset} from "./LibAsset.sol";
import {LibMath} from "./LibMath.sol";

/// @author The Sandbox
/// @title Order Handling Library
/// @notice Provides tools for constructing, hashing, and validating orders.
library LibOrder {
    bytes32 internal constant ORDER_TYPEHASH_V1 =
        keccak256(
            "Order(address maker,Asset makeAsset,address taker,Asset takeAsset,address makeRecipient,uint256 salt,uint256 start,uint256 end)Asset(AssetType assetType,uint256 value)AssetType(uint256 assetClass,bytes data)"
        );
    bytes32 internal constant ORDER_TYPEHASH_V2 =
        keccak256(
            "Order(address maker,Bundle makeAsset,address taker,Bundle takeAsset,address makeRecipient, uint256 salt,uint256 start,uint256 end)Bundle(Asset[] asset,uint256 amount)Asset(AssetType assetType,uint256 value)AssetType(uint256 assetClass,bytes data)"
        );

    enum OrderType {
        V1, // Represents order struct in the V1 format
        V2 // Represents order struct in the V2 format
    }

    struct Bundle {
        LibAsset.Asset[] asset;
        uint256 amount;
    }

    /// @dev Represents the structure of an order - V2.
    struct Order {
        address maker; // Address of the maker.
        Bundle makeAsset;
        address taker; // Address of the taker.
        Bundle takeAsset; // Asset the taker is providing.
        // uint256[] royalties // ToDo: apply royalties % on bundles
        address makeRecipient; // recipient address for maker.
        uint256 salt; // Random number to ensure unique order hash.
        uint256 start; // Timestamp when the order becomes valid.
        uint256 end; // Timestamp when the order expires.
        OrderType orderVersion;
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
        // ToDo: Try other ways of checking the order version to avoid if/else
        if (order.orderVersion == OrderType.V1) {
            return
                keccak256(
                    abi.encode(
                        order.maker,
                        order.makeRecipient,
                        LibAsset.hash(order.makeAsset.asset[0].assetType),
                        LibAsset.hash(order.takeAsset.asset[0].assetType),
                        order.salt
                    )
                );
        } else {
            bytes memory makeAssetsEncoded = encodeAssets(order.makeAsset.asset);
            bytes memory takeAssetsEncoded = encodeAssets(order.takeAsset.asset);
            return
                keccak256(
                    abi.encode(
                        order.maker,
                        order.makeRecipient,
                        keccak256(makeAssetsEncoded),
                        keccak256(takeAssetsEncoded),
                        order.salt
                    )
                );
        }
    }

    /// @notice Computes the complete hash of an order, including domain-specific data.
    /// @param order The order data.
    /// @return The complete hash of the order.
    function hash(Order calldata order) internal pure returns (bytes32) {
        // ToDo: Try other ways of checking the order version to avoid if/else
        if (order.orderVersion == OrderType.V1) {
            return
                keccak256(
                    // solhint-disable-next-line func-named-parameters
                    abi.encode(
                        ORDER_TYPEHASH_V1,
                        order.maker,
                        LibAsset.hash(order.makeAsset.asset[0]),
                        order.taker,
                        LibAsset.hash(order.takeAsset.asset[0]),
                        order.makeRecipient,
                        order.salt,
                        order.start,
                        order.end
                    )
                );
        } else {
            return
                keccak256(
                    abi.encode(
                        ORDER_TYPEHASH_V2,
                        order.maker,
                        hashBundle(order.makeAsset),
                        order.taker,
                        hashBundle(order.takeAsset),
                        order.makeRecipient,
                        order.salt,
                        order.start,
                        order.end
                    )
                );
        }
    }

    function encodeAssets(LibAsset.Asset[] memory assets) internal pure returns (bytes memory) {
        bytes memory encodedAssets = abi.encodePacked();
        for (uint i = 0; i < assets.length; i++) {
            // Concatenate the hash of each asset
            encodedAssets = abi.encodePacked(encodedAssets, LibAsset.hash(assets[i]));
        }
        return encodedAssets;
    }

    function hashBundle(Bundle memory bundle) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(encodeAssets(bundle.asset), bundle.amount));
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
            return _fillLeft(leftMakeValue, leftTakeValue, rightOrder.makeAsset.amount, rightOrder.takeAsset.amount);
        }
        return _fillRight(leftOrder.makeAsset.amount, leftOrder.takeAsset.amount, rightMakeValue, rightTakeValue);
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
        require(order.takeAsset.amount >= fill, "filling more than order permits");
        takeValue = order.takeAsset.amount - fill;
        makeValue = LibMath.safeGetPartialAmountFloor(order.makeAsset.amount, order.takeAsset.amount, takeValue);
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
