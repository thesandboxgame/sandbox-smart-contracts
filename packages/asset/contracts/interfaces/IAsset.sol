//SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

/// @title Asset interface
/// @author The Sandbox
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

    /// @notice Mint new tokens
    /// @dev Only callable by the minter role
    /// @param to The address of the recipient
    /// @param id The id of the token to mint
    /// @param amount The amount of the token to mint
    /// @param metadataHash The metadata hash of the token to mint
    function mint(
        address to,
        uint256 id,
        uint256 amount,
        string memory metadataHash
    ) external;

    /// @notice Mint new tokens with catalyst tier chosen by the creator
    /// @dev Only callable by the minter role
    /// @param to The address of the recipient
    /// @param ids The ids of the tokens to mint
    /// @param amounts The amounts of the tokens to mint
    /// @param metadataHashes The metadata hashes of the tokens to mint
    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        string[] memory metadataHashes
    ) external;

    /// @notice Burn a token from a given account
    /// @dev Only the minter role can burn tokens
    /// @dev This function was added with token recycling and bridging in mind but may have other use cases
    /// @param account The account to burn tokens from
    /// @param id The token id to burn
    /// @param amount The amount of tokens to burn
    function burnFrom(
        address account,
        uint256 id,
        uint256 amount
    ) external;

    /// @notice Burn a batch of tokens from a given account
    /// @dev Only the minter role can burn tokens
    /// @dev This function was added with token recycling and bridging in mind but may have other use cases
    /// @dev The length of the ids and amounts arrays must be the same
    /// @param account The account to burn tokens from
    /// @param ids An array of token ids to burn
    /// @param amounts An array of amounts of tokens to burn
    function burnBatchFrom(
        address account,
        uint256[] memory ids,
        uint256[] memory amounts
    ) external;

    /// @notice returns the tokenId associated with provided metadata hash
    /// @param metadataHash The metadata hash to get tokenId for
    /// @return tokenId the tokenId associated with the metadata hash
    function getTokenIdByMetadataHash(string memory metadataHash) external view returns (uint256);
}
