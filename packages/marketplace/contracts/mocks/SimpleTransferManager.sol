// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {ITransferManager} from "../transfer-manager/interfaces/ITransferManager.sol";
import {LibAsset} from "../lib-asset/LibAsset.sol";

abstract contract SimpleTransferManager is ITransferManager {
    function doTransfers(
        DealSide memory left,
        DealSide memory right,
        LibAsset.FeeSide /* feeSide */
    ) internal override {
        transfer(left.asset, left.from, right.from);
        transfer(right.asset, right.from, left.from);
    }

    uint256[50] private __gap;
}
