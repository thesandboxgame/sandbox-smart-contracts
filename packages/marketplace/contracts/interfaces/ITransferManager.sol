// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {LibAsset} from "../libraries/LibAsset.sol";

abstract contract ITransferManager {
    struct DealSide {
        LibAsset.Asset asset;
        address account;
    }

    function doTransfers(DealSide memory left, DealSide memory right, LibAsset.FeeSide feeSide) internal virtual;
}
