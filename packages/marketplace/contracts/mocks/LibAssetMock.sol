// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {LibAsset} from "../libraries/LibAsset.sol";

contract LibAssetMock {
    function getFeeSide(
        LibAsset.AssetClass leftClass,
        LibAsset.AssetClass rightClass
    ) external pure returns (LibAsset.FeeSide) {
        // ToDo: Fix
        // return LibAsset.getFeeSide(leftClass, rightClass);
        return LibAsset.FeeSide.LEFT;
    }

    /// @notice calculate if Asset types match with each other
    /// @param leftType to be matched with rightAssetType
    /// @param rightType to be matched with leftAssetType
    /// @return AssetType of the match
    function matchAssets(
        LibAsset.AssetType calldata leftType,
        LibAsset.AssetType calldata rightType
    ) external pure returns (LibAsset.AssetType memory) {
        return LibAsset.matchAssets(leftType, rightType);
    }

    ///    @notice calculate hash of asset type
    ///    @param assetType to be hashed
    ///    @return hash of assetType
    function hash(LibAsset.AssetType memory assetType) external pure returns (bytes32) {
        return LibAsset.hash(assetType);
    }

    ///    @notice calculate hash of asset
    ///    @param asset to be hashed
    ///    @return hash of asset
    function hash(LibAsset.Asset memory asset) external pure returns (bytes32) {
        return LibAsset.hash(asset);
    }
}
