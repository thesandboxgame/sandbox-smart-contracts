// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {LibAsset} from "../libraries/LibAsset.sol";

abstract contract ITransferManager {
    struct DealSide {
        LibAsset.Asset asset;
        address account;
    }

    /// @notice executes transfers for 2 matched orders
    /// @param left DealSide from the left order (see LibDeal.sol)
    /// @param right DealSide from the right order (see LibDeal.sol)
    /// @dev this is the main entry point, when used as a separated contract this method will be external
    function doTransfers(DealSide memory left, DealSide memory right, LibAsset.FeeSide feeSide) internal virtual;
}
