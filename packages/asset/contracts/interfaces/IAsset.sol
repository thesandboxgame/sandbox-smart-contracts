//SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface IAsset {
    // Events
    event AssetsRecycled(
        address recycler,
        uint256[] tokenIds,
        uint256[] amounts,
        uint256 catalystTier,
        uint256 catalystAmount
    );

    struct AssetData {
        uint256 tokenId;
        address creator;
        uint256 amount;
        uint8 tier;
        uint16 creatorNonce;
        bool revealed;
        string metadataHash;
    }

    // Functions
    function bridgeMint(
        uint256 originalTokenId,
        uint256 amount,
        uint8 tier,
        address recipient,
        string memory metadataHash
    ) external;

    function mint(address to, uint256 id, uint256 amount) external;

    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts
    ) external;

    function mintSpecial(
        address recipient,
        AssetData calldata assetData,
        string memory metadataHash
    ) external;

    function burnFrom(address account, uint256 id, uint256 amount) external;

    function burnBatchFrom(
        address account,
        uint256[] memory ids,
        uint256[] memory amounts
    ) external;

    function recycleBurn(
        address recycler,
        uint256[] calldata tokenIds,
        uint256[] calldata amounts,
        uint256 catalystTier
    ) external returns (uint256);

    function setRecyclingAmount(
        uint256 catalystTokenId,
        uint256 amount
    ) external;

    function getRecyclingAmount(
        uint256 catalystTokenId
    ) external view returns (uint256);

    function getTokenIdByMetadataHash(
        string memory metadataHash
    ) external view returns (uint256);

    function setMetadataHashUsed(
        uint256 tokenId,
        string memory metadataHash
    ) external;

    function getIncrementedCreatorNonce(
        address creator
    ) external returns (uint16);
}
