// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {LibAsset} from "../lib-asset/LibAsset.sol";
import {LibMath} from "./LibMath.sol";

/// @title library for Order
/// @notice contains structs and functions related to Order
library LibOrder {
    bytes32 internal constant ORDER_TYPEHASH =
        keccak256(
            "Order(address maker,Asset makeAsset,address taker,Asset takeAsset,uint256 salt,uint256 start,uint256 end,bytes4 dataType,bytes data)Asset(AssetType assetType,uint256 value)AssetType(uint256 assetClass,bytes data)"
        );

    bytes4 internal constant DEFAULT_ORDER_TYPE = 0xffffffff;

    struct Order {
        address maker;
        LibAsset.Asset makeAsset;
        address taker;
        LibAsset.Asset takeAsset;
        uint256 salt;
        uint256 start;
        uint256 end;
        bytes4 dataType;
        bytes data;
    }

    /// @notice calculate the remaining fill from orders
    /// @param order order that we will calculate the remaining fill
    /// @param fill to be subtracted
    /// @param isMakeFill if true take fill from make side, if false from take
    /// @return makeValue remaining fill from make side
    /// @return takeValue remaining fill from take side
    function calculateRemaining(
        Order memory order,
        uint256 fill,
        bool isMakeFill
    ) internal pure returns (uint256 makeValue, uint256 takeValue) {
        if (isMakeFill) {
            makeValue = order.makeAsset.value - fill;
            takeValue = LibMath.safeGetPartialAmountFloor(order.takeAsset.value, order.makeAsset.value, makeValue);
        } else {
            takeValue = order.takeAsset.value - fill;
            makeValue = LibMath.safeGetPartialAmountFloor(order.makeAsset.value, order.takeAsset.value, takeValue);
        }
    }

    /// @notice calculate hash key from order
    /// @param order object to be hashed
    /// @return hash key of order
    function hashKey(Order calldata order) internal pure returns (bytes32) {
        if (order.dataType == DEFAULT_ORDER_TYPE) {
            return
                keccak256(
                    abi.encode(
                        order.maker,
                        LibAsset.hash(order.makeAsset.assetType),
                        LibAsset.hash(order.takeAsset.assetType),
                        order.salt
                    )
                );
        } else {
            //order.data is in hash for V3 and all new order
            return
                keccak256(
                    abi.encode(
                        order.maker,
                        LibAsset.hash(order.makeAsset.assetType),
                        LibAsset.hash(order.takeAsset.assetType),
                        order.salt,
                        order.data
                    )
                );
        }
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
                    order.end,
                    order.dataType,
                    keccak256(order.data)
                )
            );
    }

    /// @notice validates order time
    /// @param order whose time we want to validate
    function validateOrderTime(LibOrder.Order memory order) internal view {
        // solhint-disable-next-line not-rely-on-time
        require(order.start == 0 || order.start < block.timestamp, "Order start validation failed");
        // solhint-disable-next-line not-rely-on-time
        require(order.end == 0 || order.end > block.timestamp, "Order end validation failed");
    }
}
