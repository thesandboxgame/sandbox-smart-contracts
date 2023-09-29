// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

/// @title library for Assets
/// @notice contains structs for Asset and AssetType
/// @dev Asset represents any asset on ethereum blockchain.
/// @dev AssetType is a type of a specific asset
library LibAsset {
    enum AssetClassType {
        INVALID_ASSET_CLASS,
        ERC20_ASSET_CLASS,
        ERC721_ASSET_CLASS,
        ERC1155_ASSET_CLASS
    }
    bytes32 internal constant ASSET_TYPE_TYPEHASH = keccak256("AssetType(uint256 assetClass,bytes data)");

    bytes32 internal constant ASSET_TYPEHASH =
        keccak256("Asset(AssetType assetType,uint256 value)AssetType(uint256 assetClass,bytes data)");

    struct AssetType {
        LibAsset.AssetClassType assetClass;
        bytes data;
    }

    struct Asset {
        AssetType assetType;
        uint256 value;
    }

    ///    @notice calculate hash of asset type
    ///    @param assetType to be hashed
    ///    @return hash of assetType
    function hash(AssetType memory assetType) internal pure returns (bytes32) {
        return keccak256(abi.encode(ASSET_TYPE_TYPEHASH, assetType.assetClass, keccak256(assetType.data)));
    }

    ///    @notice calculate hash of asset
    ///    @param asset to be hashed
    ///    @return hash of asset
    function hash(Asset memory asset) internal pure returns (bytes32) {
        return keccak256(abi.encode(ASSET_TYPEHASH, hash(asset.assetType), asset.value));
    }
}
