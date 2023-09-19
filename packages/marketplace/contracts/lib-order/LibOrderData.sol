// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

/// @title library for order data types
/// @notice Data types, corresponding transfers/fees logic
library LibOrderData {
    /// @notice hash for order data type sell
    /// @return SELL hash
    bytes4 public constant SELL = bytes4(keccak256("SELL"));

    /// @notice hash for order data type buy
    /// @return BUY hash
    bytes4 public constant BUY = bytes4(keccak256("BUY"));

    struct DataSell {
        uint256 payouts;
        uint256 originFeeFirst;
        uint256 originFeeSecond;
        uint256 maxFeesBasePoint;
        bytes32 marketplaceMarker;
    }

    struct DataBuy {
        uint256 payouts;
        uint256 originFeeFirst;
        uint256 originFeeSecond;
        bytes32 marketplaceMarker;
    }
}
