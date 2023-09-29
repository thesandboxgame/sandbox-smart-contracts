// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {IAssetMatcher, LibAsset} from "../interfaces/IAssetMatcher.sol";

/// @title AssetMatcher contract
/// @notice matchAssets function should calculate if Asset types match with each other
contract AssetMatcher is IAssetMatcher {
    bytes internal constant EMPTY = "";

    /// @notice calculate if Asset types match with each other
    /// @param leftAssetType to be matched with rightAssetType
    /// @param rightAssetType to be matched with leftAssetType
    /// @return AssetType of the match
    function matchAssets(
        LibAsset.AssetType memory leftAssetType,
        LibAsset.AssetType memory rightAssetType
    ) external pure returns (LibAsset.AssetType memory) {
        LibAsset.AssetClassType classLeft = leftAssetType.assetClass;
        LibAsset.AssetClassType classRight = rightAssetType.assetClass;
        require(classLeft != LibAsset.AssetClassType.INVALID_ASSET_CLASS, "not found IAssetMatcher");
        require(classRight != LibAsset.AssetClassType.INVALID_ASSET_CLASS, "not found IAssetMatcher");
        if (classLeft == classRight) {
            return simpleMatch(leftAssetType, rightAssetType);
        }
        return LibAsset.AssetType(LibAsset.AssetClassType.INVALID_ASSET_CLASS, EMPTY);
    }

    function simpleMatch(
        LibAsset.AssetType memory leftAssetType,
        LibAsset.AssetType memory rightAssetType
    ) private pure returns (LibAsset.AssetType memory) {
        bytes32 leftHash = keccak256(leftAssetType.data);
        bytes32 rightHash = keccak256(rightAssetType.data);
        if (leftHash == rightHash) {
            return leftAssetType;
        }
        return LibAsset.AssetType(LibAsset.AssetClassType.INVALID_ASSET_CLASS, EMPTY);
    }
}
