// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {LibDeal} from "../lib/LibDeal.sol";
import {ITransferExecutor} from "./ITransferExecutor.sol";

abstract contract ITransferManager is ITransferExecutor {
    function doTransfers(
        LibDeal.DealSide memory left,
        LibDeal.DealSide memory right,
        LibDeal.DealData memory dealData
    ) internal virtual returns (uint256 totalMakeValue, uint256 totalTakeValue);
}
