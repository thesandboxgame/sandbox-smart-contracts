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
        address creator;
        uint256 amount;
        uint8 tier;
        uint16 creatorNonce;
        bool revealed;
        uint40 revealHash;
    }

    // Functions
    function mint(
        AssetData calldata assetData,
        string memory assetUri
    ) external;

    function bridgeMint(
        uint256 originalTokenId,
        uint256 amount,
        uint8 tier,
        address recipient,
        bool revealed,
        uint40 revealHash,
        string memory assetUri
    ) external;

    function mintBatch(
        AssetData[] calldata assetData,
        string[] memory assetUris
    ) external;

    function revealMint(
        address recipient,
        uint256 amount,
        uint256 prevTokenId,
        uint40[] calldata revealHashes,
        string[] memory assetUris
    ) external returns (uint256[] memory tokenIds);

    function mintSpecial(
        address recipient,
        AssetData calldata assetData,
        string memory assetUri
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

    function setURI(string memory newuri) external;

    function getRecyclingAmount(
        uint256 catalystTokenId
    ) external view returns (uint256);
}
