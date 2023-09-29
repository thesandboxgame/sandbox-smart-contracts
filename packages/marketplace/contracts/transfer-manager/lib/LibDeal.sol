// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {LibPart} from "../../lib-part/LibPart.sol";
import {LibAsset} from "../../lib-asset/LibAsset.sol";

library LibDeal {
    struct DealSide {
        LibAsset.Asset asset;
        LibPart.Part[] payouts;
        address from;
    }
}
