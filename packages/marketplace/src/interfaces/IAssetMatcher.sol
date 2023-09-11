// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {LibAsset} from "../lib-asset/LibAsset.sol";

/// @title interface for AssetMatcher
/// @notice contains the signature for matchAssets that verifies if order assets match
interface IAssetMatcher {
    /// @notice matchAssets function
    /// @param leftAssetType left order
    /// @param rightAssetType right order
    /// @return AssetType of matched asset
    function matchAssets(
        LibAsset.AssetType memory leftAssetType,
        LibAsset.AssetType memory rightAssetType
    ) external view returns (LibAsset.AssetType memory);
}
