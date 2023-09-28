// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {LibPart} from "../../lib-part/LibPart.sol";
import {LibAsset} from "../../lib-asset/LibAsset.sol";
import {LibFeeSide} from "./LibFeeSide.sol";

library LibDeal {
    struct DealSide {
        LibAsset.Asset asset;
        LibPart.Part[] payouts;
        LibPart.Part[] originFees;
        address from;
    }

    struct DealData {
        uint256 protocolFee;
        uint256 maxFeesBasePoint;
        LibFeeSide.FeeSide feeSide;
    }
}
