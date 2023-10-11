// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {ITransferExecutor} from "./ITransferExecutor.sol";
import {LibAsset} from "../../lib-asset/LibAsset.sol";
import {LibPart} from "../../lib-part/LibPart.sol";

abstract contract ITransferManager is ITransferExecutor {
    struct DealSide {
        LibAsset.Asset asset;
        LibPart.Part[] payouts;
        address from;
    }
    
    /// @notice executes transfers for 2 matched orders
    /// @param left DealSide from the left order (see LibDeal.sol)
    /// @param right DealSide from the right order (see LibDeal.sol)
    /// @dev this is the main entry point, when used as a separated contract this method will be external
    function doTransfers(DealSide memory left, DealSide memory right, LibAsset.FeeSide feeSide) internal virtual;
}
