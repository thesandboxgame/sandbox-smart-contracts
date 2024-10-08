//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IAsset} from "../interfaces/IAsset.sol";

/// @title TokenIdUtils library
/// @author The Sandbox
/// @notice Contains utility functions for token ids
library TokenIdUtils {
    // Layer masks
    uint256 public constant TIER_MASK = 0xFF;
    uint256 public constant NONCE_MASK = 0xFFFF;
    uint256 public constant REVEAL_NONCE_MASK = 0xFFFF;
    uint256 public constant BRIDGED_MASK = 0x1;

    // Bit shifts
    uint256 public constant CREATOR_SHIFT = 0;
    uint256 public constant TIER_SHIFT = 160;
    uint256 public constant NONCE_SHIFT = 168;
    uint256 public constant REVEAL_NONCE_SHIFT = 184;
    uint256 public constant BRIDGED_SHIFT = 200;

    /// @notice Generates a token id for a given asset
    /// @dev The token id is generated by concatenating the following fields:
    /// @dev creator address, tier, creator nonce, reveal nonce and bridged boolean
    /// @dev The first 160 bits are the creator address
    /// @dev The next 8 bits are the tier
    /// @dev The next 16 bits are the creator nonce
    /// @dev The next 16 bits are for reveal nonce.
    /// @dev The last bit is for bridged boolean
    /// @param creator The address of the creator of the asset
    /// @param tier The tier of the asset determined by the catalyst used to create it
    /// @param creatorNonce The nonce of the asset creator
    /// @param revealNonce The reveal nonce of the asset
    /// @param bridged Whether the asset is bridged or not
    /// @return tokenId The generated token id
    function generateTokenId(
        address creator,
        uint8 tier,
        uint16 creatorNonce,
        uint16 revealNonce,
        bool bridged
    ) internal pure returns (uint256 tokenId) {
        uint160 creatorAddress = uint160(creator);

        tokenId = tokenId =
            uint256(creatorAddress) |
            (uint256(tier) << TIER_SHIFT) |
            (uint256(creatorNonce) << NONCE_SHIFT) |
            (uint256(revealNonce) << REVEAL_NONCE_SHIFT) |
            (uint256(bridged ? 1 : 0) << BRIDGED_SHIFT);

        return tokenId;
    }

    /// @notice Extracts the creator address from a given token id
    /// @param tokenId The token id to extract the creator address from
    /// @return creator The asset creator address
    function getCreatorAddress(uint256 tokenId) internal pure returns (address creator) {
        creator = address(uint160(tokenId));
        return creator;
    }

    /// @notice Extracts the tier from a given token id
    /// @param tokenId The token id to extract the tier from
    /// @return tier The asset tier, determined by the catalyst used to create it
    function getTier(uint256 tokenId) internal pure returns (uint8 tier) {
        tier = uint8((tokenId >> TIER_SHIFT) & TIER_MASK);
        return tier;
    }

    /// @notice Extracts the revealed flag from a given token id
    /// @param tokenId The token id to extract the revealed flag from
    /// @return isRevealed Whether the asset is revealed or not
    function isRevealed(uint256 tokenId) internal pure returns (bool) {
        uint16 revealNonce = getRevealNonce(tokenId);
        return revealNonce != 0;
    }

    /// @notice Extracts the asset nonce from a given token id
    /// @param tokenId The token id to extract the asset nonce from
    /// @return creatorNonce The asset creator nonce
    function getCreatorNonce(uint256 tokenId) internal pure returns (uint16) {
        uint16 creatorNonce = uint16((tokenId >> NONCE_SHIFT) & NONCE_MASK);
        return creatorNonce;
    }

    /// @notice Extracts the abilities and enhancements hash from a given token id
    /// @param tokenId The token id to extract reveal nonce from
    /// @return revealNonce The reveal nonce of the asset
    function getRevealNonce(uint256 tokenId) internal pure returns (uint16) {
        uint16 revealNonce = uint16((tokenId >> REVEAL_NONCE_SHIFT) & REVEAL_NONCE_MASK);
        return revealNonce;
    }

    /// @notice Extracts the bridged flag from a given token id
    /// @param tokenId The token id to extract the bridged flag from
    /// @return bridged Whether the asset is bridged or not
    function isBridged(uint256 tokenId) internal pure returns (bool) {
        bool bridged = ((tokenId >> BRIDGED_SHIFT) & BRIDGED_MASK) == 1;
        return bridged;
    }

    /// @notice Extracts the asset data from a given token id
    /// @dev Created to limit the number of functions that need to be called when revealing an asset
    /// @param tokenId The token id to extract the asset data from
    /// @return data The asset data struct
    function getData(uint256 tokenId) internal pure returns (IAsset.AssetData memory data) {
        data.creator = getCreatorAddress(tokenId);
        data.tier = getTier(tokenId);
        data.revealed = isRevealed(tokenId);
        data.creatorNonce = getCreatorNonce(tokenId);
        data.bridged = isBridged(tokenId);
    }
}
