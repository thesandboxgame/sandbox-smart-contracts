//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;
pragma experimental ABIEncoderV2;

interface IAssetMinter {
    // asset no Catalyst needed for minting
    enum AssetTypeNoTier {art, prop}

    struct AssetData {
        uint16[] gemIds;
        uint16 catalystId;
    }

    // use only to fix stack too deep
    struct MintMultipleData {
        address from;
        uint40 packId;
        bytes32 metadataHash;
    }

    function mintWithoutCatalyst(
        address from,
        uint40 packId,
        bytes32 metadataHash,
        address to,
        IAssetMinter.AssetTypeNoTier typeAsset,
        bytes calldata data
    ) external returns (uint256 assetId);

    function mintWithCatalyst(
        address from,
        uint40 packId,
        bytes32 metadataHash,
        uint16 catalystId,
        uint16[] calldata gemIds,
        address to,
        bytes calldata data
    ) external returns (uint256 assetId);

    function mintMultipleWithCatalyst(
        MintMultipleData memory mintData,
        AssetData[] memory assets,
        address to,
        bytes memory data
    ) external returns (uint256[] memory assetIds);

    function mintCustomNumberWithCatalyst(
        address from,
        uint40 packId,
        bytes32 metadataHash,
        uint16 catalystId,
        uint16[] calldata gemIds,
        uint256 quantity,
        address to,
        bytes calldata data
    ) external returns (uint256 assetId);
}
