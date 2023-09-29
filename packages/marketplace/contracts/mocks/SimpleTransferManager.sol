// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {ITransferManager, LibDeal, LibFeeSide} from "../transfer-manager/interfaces/ITransferManager.sol";

abstract contract SimpleTransferManager is ITransferManager {
    function doTransfers(
        LibDeal.DealSide memory left,
        LibDeal.DealSide memory right,
        LibFeeSide.FeeSide /* feeSide */
    ) internal override {
        transfer(left.asset, left.from, right.from);
        transfer(right.asset, right.from, left.from);
    }

    uint256[50] private __gap;
}
