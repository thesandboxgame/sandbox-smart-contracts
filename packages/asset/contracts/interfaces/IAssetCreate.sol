//SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface IAssetCreate {
    event AssetMinted(
        address indexed creator,
        uint256 tokenId,
        uint16 tier,
        uint256 amount,
        string metadataHash
    );
    event SpecialAssetMinted(
        address indexed creator,
        uint256 tokenId,
        uint256 amount,
        string metadataHash
    );
    event AssetBatchMinted(
        address indexed creator,
        uint256[] tokenIds,
        uint8[] tiers,
        uint256[] amounts,
        string[] metadataHashes
    );
}
