// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {LibAsset} from "../../lib-asset/LibAsset.sol";

library LibFeeSide {
    enum FeeSide {
        NONE,
        LEFT,
        RIGHT
    }

    function getFeeSide(
        LibAsset.AssetClassType leftClass,
        LibAsset.AssetClassType rightClass
    ) internal pure returns (FeeSide) {
        if (leftClass == LibAsset.AssetClassType.ERC20_ASSET_CLASS) {
            return FeeSide.LEFT;
        }
        if (rightClass == LibAsset.AssetClassType.ERC20_ASSET_CLASS) {
            return FeeSide.RIGHT;
        }
        if (leftClass == LibAsset.AssetClassType.ERC1155_ASSET_CLASS) {
            return FeeSide.LEFT;
        }
        if (rightClass == LibAsset.AssetClassType.ERC1155_ASSET_CLASS) {
            return FeeSide.RIGHT;
        }
        return FeeSide.NONE;
    }
}
