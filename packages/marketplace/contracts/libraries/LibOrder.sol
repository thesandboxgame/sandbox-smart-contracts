// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {LibAsset} from "./LibAsset.sol";

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
    function validateOrderTime(Order memory order) internal view {
        // solhint-disable-next-line not-rely-on-time
        require(order.start == 0 || order.start < block.timestamp, "Order start validation failed");
        // solhint-disable-next-line not-rely-on-time
        require(order.end == 0 || order.end > block.timestamp, "Order end validation failed");
    }
}
