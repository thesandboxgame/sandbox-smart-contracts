// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {LibAsset} from "../libraries/LibAsset.sol";

/// @author The Sandbox
/// @title ITransferManager Interface
/// @custom:security-contact contact-blockchain@sandbox.game
/// @notice Provides an interface for managing transfers of assets between matched orders.
abstract contract ITransferManager {
    /// @dev Represents a side (either maker or taker) of a deal.
    /// Each side has an associated asset and an account address.
    struct DealSide {
        LibAsset.Asset asset; // The asset associated with this side of the deal.
        address account; // The account address associated with this side of the deal.
    }

    /// @notice Executes the asset transfers associated with two matched orders.
    /// @param left The DealSide representing the left order's side.
    /// @param right The DealSide representing the right order's side.
    /// @param feeSide Indicates which side of the deal will bear the fee.
    /// @dev This function serves as the primary entry point for asset transfers.
    /// If used in a separate contract, the visibility of this method might change to external.
    function doTransfers(DealSide memory left, DealSide memory right, LibAsset.FeeSide feeSide) internal virtual;
}
