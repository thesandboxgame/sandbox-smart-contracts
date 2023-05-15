//SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface ICatalyst {
    enum CatalystType {
        TSB_EXCLUSIVE,
        COMMON,
        UNCOMMON,
        RARE,
        EPIC,
        LEGENDARY,
        MYTHIC
    }

    event TrustedForwarderChanged(address indexed newTrustedForwarderAddress);
    event NewCatalystTypeAdded(uint256 catalystId);
    event DefaultRoyaltyChanged(
        address indexed newDefaultRoyaltyRecipient,
        uint256 newDefaultRoyaltyAmount
    );

    /// @notice Mints a new token, limited to MINTER_ROLE only
    /// @param to The address that will own the minted token
    /// @param id The token id to mint
    /// @param amount The amount to be minted
    function mint(address to, uint256 id, uint256 amount) external;

    /// @notice Mints a batch of tokens, limited to MINTER_ROLE only
    /// @param to The address that will own the minted tokens
    /// @param ids The token ids to mint
    /// @param amounts The amounts to be minted per token id
    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts
    ) external;

    /// @notice Burns a specified amount of tokens from a specific address
    /// @param account The address to burn from
    /// @param id The token id to burn
    /// @param amount The amount to be burned
    function burnFrom(address account, uint256 id, uint256 amount) external;

    /// @notice Burns a batch of tokens from a specific address
    /// @param account The address to burn from
    /// @param ids The token ids to burn
    /// @param amounts The amounts to be burned
    function burnBatchFrom(
        address account,
        uint256[] memory ids,
        uint256[] memory amounts
    ) external;

    /// @notice Add a new catalyst type, limited to DEFAULT_ADMIN_ROLE only
    /// @param catalystId The catalyst id to add
    /// @param ipfsCID The royalty bps for the catalyst
    function addNewCatalystType(
        uint256 catalystId,
        string memory ipfsCID
    ) external;

    /// @notice Set a new URI for specific tokenid
    /// @param tokenId The token id to set URI for
    /// @param metadataHash The new URI
    function setMetadataHash(
        uint256 tokenId,
        string memory metadataHash
    ) external;

    /// @notice Set a new base URI
    /// @param baseURI The new base URI
    function setBaseURI(string memory baseURI) external;

    /// @notice Change the default royalty settings
    /// @param defaultRoyaltyRecipient The new royalty recipient address
    /// @param defaultRoyaltyBps The new royalty bps
    function changeRoyaltyRecipient(
        address defaultRoyaltyRecipient,
        uint96 defaultRoyaltyBps
    ) external;
}
