// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

/// @title library for Assets
/// @notice contains structs for Asset and AssetType
/// @dev Asset represents any asset on ethereum blockchain.
/// @dev AssetType is a type of a specific asset
library LibAsset {
    bytes4 public constant ETH_ASSET_CLASS = bytes4(keccak256("ETH"));
    bytes4 public constant ERC20_ASSET_CLASS = bytes4(keccak256("ERC20"));
    bytes4 public constant ERC721_ASSET_CLASS = bytes4(keccak256("ERC721"));
    bytes4 public constant ERC1155_ASSET_CLASS = bytes4(keccak256("ERC1155"));
    bytes4 public constant ERC721_TSB_CLASS = bytes4(keccak256("ERC721_TSB"));
    bytes4 public constant ERC1155_TSB_CLASS = bytes4(keccak256("ERC1155_TSB"));
    bytes4 public constant BUNDLE = bytes4(keccak256("BUNDLE"));
    bytes4 public constant COLLECTION = bytes4(keccak256("COLLECTION"));

    bytes32 internal constant ASSET_TYPE_TYPEHASH = keccak256("AssetType(bytes4 assetClass,bytes data)");

    bytes32 internal constant ASSET_TYPEHASH =
        keccak256("Asset(AssetType assetType,uint256 value)AssetType(bytes4 assetClass,bytes data)");

    struct AssetType {
        bytes4 assetClass;
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
