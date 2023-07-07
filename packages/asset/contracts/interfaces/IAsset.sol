//SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface IAsset {
    // AssetData reflects the asset tokenId structure
    // Refer to TokenIdUtils.sol
    struct AssetData {
        uint256 tokenId;
        address creator;
        uint256 amount;
        uint8 tier;
        uint16 creatorNonce;
        bool revealed;
        string metadataHash;
        bool bridged;
    }

    event TrustedForwarderChanged(address indexed newTrustedForwarderAddress);

    // Functions
    function mint(address to, uint256 id, uint256 amount, string memory metadataHash) external;

    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        string[] memory metadataHashes
    ) external;

    function burnFrom(address account, uint256 id, uint256 amount) external;

    function burnBatchFrom(address account, uint256[] memory ids, uint256[] memory amounts) external;

    function getTokenIdByMetadataHash(string memory metadataHash) external view returns (uint256);
}
