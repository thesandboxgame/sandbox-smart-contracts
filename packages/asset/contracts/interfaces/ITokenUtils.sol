//SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import {IRoyaltyUGC} from "@sandbox-smart-contracts/dependency-royalty-management/contracts/interfaces/IRoyaltyUGC.sol";

/// @title TokenUtils interface
/// @author The Sandbox
interface ITokenUtils is IRoyaltyUGC {
    /// @notice Extracts the tier from a given token id
    /// @param tokenId The token id to extract the tier from
    /// @return tier The asset tier, determined by the catalyst used to create it
    function getTier(uint256 tokenId) external pure returns (uint8 tier);

    /// @notice Extracts the revealed flag from a given token id
    /// @param tokenId The token id to extract the revealed flag from
    /// @return revealed Whether the asset is revealed or not
    function isRevealed(uint256 tokenId) external pure returns (bool revealed);

    /// @notice Extracts the asset nonce from a given token id
    /// @param tokenId The token id to extract the asset nonce from
    /// @return creatorNonce The asset creator nonce
    function getCreatorNonce(uint256 tokenId) external pure returns (uint16 creatorNonce);

    /// @notice Extracts the abilities and enhancements hash from a given token id
    /// @param tokenId The token id to extract reveal nonce from
    /// @return revealNonce The reveal nonce of the asset
    function getRevealNonce(uint256 tokenId) external pure returns (uint16 revealNonce);

    /// @notice Extracts the bridged flag from a given token id
    /// @param tokenId The token id to extract the bridged flag from
    /// @return bridged Whether the asset is bridged or not
    function isBridged(uint256 tokenId) external pure returns (bool bridged);

    /// @notice Extracts the creator address from a given token id
    /// @param tokenId The token id to extract the creator address from
    /// @return creator The asset creator address
    function getCreatorAddress(uint256 tokenId) external pure returns (address creator);
}
