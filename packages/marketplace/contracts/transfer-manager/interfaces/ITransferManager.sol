// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {LibDeal, LibFeeSide} from "../lib/LibDeal.sol";
import {ITransferExecutor} from "./ITransferExecutor.sol";

abstract contract ITransferManager is ITransferExecutor {
    function doTransfers(
        LibDeal.DealSide memory left,
        LibDeal.DealSide memory right,
        LibFeeSide.FeeSide feeSide
    ) internal virtual returns (uint256 totalMakeValue, uint256 totalTakeValue);
}
