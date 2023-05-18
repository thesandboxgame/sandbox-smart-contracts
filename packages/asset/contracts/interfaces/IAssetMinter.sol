//SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface IAssetMinter {
    // Events
    event AssetContractAddressChanged(address newAddress);
    event CatalystContractAddressChanged(address newAddress);
    event AssetRevealBurn(
        address revealer,
        uint256 tokenId,
        address assetCreator,
        uint8 tier,
        uint16 assetNonce,
        uint256 amount
    );

    event AssetsRevealed(
        address recipient,
        address creator,
        uint256 oldTokenId,
        uint256[] newTokenIds
    );

    struct MintableAsset {
        address creator;
        uint256 amount;
        uint256 voxelHash;
        uint8 tier;
        uint16 creatorNonce;
    }

    // Functions
    function mintAsset(
        bytes memory signature,
        MintableAsset memory asset,
        string memory assetUri
    ) external;

    function mintAssetBatch(
        bytes memory signature,
        MintableAsset[] memory mintableAssets,
        string[] memory assetUris
    ) external;

    function mintExclusive(
        address creator,
        address recipient,
        uint256 amount,
        string memory assetUri
    ) external;

    function recycleAssets(
        uint256[] calldata tokenIds,
        uint256[] calldata amounts,
        uint256 catalystTier
    ) external;

    function changeCatalystContractAddress(address _catalystContract) external;

    function changeAssetContractAddress(address _catalystContract) external;
}
