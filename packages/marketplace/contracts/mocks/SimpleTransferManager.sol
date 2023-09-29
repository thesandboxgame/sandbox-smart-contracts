// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {ITransferManager, LibDeal, LibFeeSide} from "../transfer-manager/interfaces/ITransferManager.sol";

abstract contract SimpleTransferManager is ITransferManager {
    function doTransfers(
        LibDeal.DealSide memory left,
        LibDeal.DealSide memory right,
        LibFeeSide.FeeSide /* feeSide */
    ) internal override returns (uint256 totalMakeValue, uint256 totalTakeValue) {
        transfer(left.asset, left.from, right.from);
        transfer(right.asset, right.from, left.from);
        totalMakeValue = left.asset.value;
        totalTakeValue = right.asset.value;
    }

    uint256[50] private __gap;
}
