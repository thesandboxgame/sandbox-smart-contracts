//SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface IAssetMinter {
    // Events
    event AssetContractAddressChanged(address newAddress);
    event CatalystContractAddressChanged(address newAddress);

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
        string memory metadataHash
    ) external;

    function mintAssetBatch(
        bytes memory signature,
        MintableAsset[] memory mintableAssets,
        string[] memory metadataHashes
    ) external;

    function mintExclusive(
        address creator,
        address recipient,
        uint256 amount,
        string memory metadataHash
    ) external;

    function recycleAssets(
        uint256[] calldata tokenIds,
        uint256[] calldata amounts,
        uint256 catalystTier
    ) external;

    function changeCatalystContractAddress(address _catalystContract) external;

    function changeAssetContractAddress(address _catalystContract) external;
}
