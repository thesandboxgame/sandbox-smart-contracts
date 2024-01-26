//SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

/// @title AssetCreate interface
/// @author The Sandbox
interface IAssetCreate {
    event TrustedForwarderChanged(address indexed newTrustedForwarderAddress);
    event AssetMinted(
        address indexed creator,
        uint256 tokenId,
        uint16 tier,
        uint256 amount,
        string metadataHash,
        bool revealed
    );
    event SpecialAssetMinted(
        address indexed creator,
        uint256 tokenId,
        uint16 tier,
        uint256 amount,
        string metadataHash,
        bool revealed
    );
    event SpecialAssetBatchMinted(
        address indexed creator,
        uint256[] tokenIds,
        uint8[] tiers,
        uint256[] amounts,
        string[] metadataHashes,
        bool[] revealed
    );
    event AssetBatchMinted(
        address indexed creator,
        uint256[] tokenIds,
        uint8[] tiers,
        uint256[] amounts,
        string[] metadataHashes,
        bool[] revealed
    );
    event AssetLazyMinted(
        address indexed recipient,
        address indexed creator,
        uint256 tokenId,
        uint16 tier,
        uint256 amount,
        string metadataHash,
        bool revealed
    );
    event AssetBatchLazyMinted(
        address indexed recipient,
        address[] indexed creators,
        uint256[] tokenIds,
        uint8[] tiers,
        uint256[] amounts,
        string[] metadataHashes,
        bool[] revealed
    );
}
