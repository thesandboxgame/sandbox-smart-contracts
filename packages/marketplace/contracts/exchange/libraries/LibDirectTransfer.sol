// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

/// @title library containing the structs for direct purchase
library LibDirectTransfer {
    /// @notice Purchase, all buy parameters need for create buyOrder and sellOrder
    struct Purchase {
        address sellOrderMaker;
        uint256 sellOrderNftAmount;
        bytes4 nftAssetClass;
        bytes nftData;
        uint256 sellOrderPaymentAmount;
        address paymentToken;
        uint256 sellOrderSalt;
        uint256 sellOrderStart;
        uint256 sellOrderEnd;
        bytes4 sellOrderDataType;
        bytes sellOrderData;
        bytes sellOrderSignature;
        uint256 buyOrderPaymentAmount;
        uint256 buyOrderNftAmount;
        bytes buyOrderData;
    }

    /// @notice AcceptBid, all accept bid parameters need for create buyOrder and sellOrder
    struct AcceptBid {
        address bidMaker;
        uint256 bidNftAmount;
        bytes4 nftAssetClass;
        bytes nftData;
        uint256 bidPaymentAmount;
        address paymentToken;
        uint256 bidSalt;
        uint256 bidStart;
        uint256 bidEnd;
        bytes4 bidDataType;
        bytes bidData;
        bytes bidSignature;
        uint256 sellOrderPaymentAmount;
        uint256 sellOrderNftAmount;
        bytes sellOrderData;
    }
}
