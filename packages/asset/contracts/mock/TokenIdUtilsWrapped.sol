//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libraries/TokenIdUtils.sol";
import {IAsset} from "../interfaces/IAsset.sol";

contract TokenIdUtilsWrapped {
    function generateTokenId(
        address creator,
        uint8 tier,
        uint16 creatorNonce,
        uint16 revealNonce,
        bool bridged
    ) public pure returns (uint256 tokenId) {
        return TokenIdUtils.generateTokenId(creator, tier, creatorNonce, revealNonce, bridged);
    }

    function getCreatorAddress(uint256 tokenId) public pure returns (address creator) {
        return TokenIdUtils.getCreatorAddress(tokenId);
    }

    function getTier(uint256 tokenId) public pure returns (uint8 tier) {
        return TokenIdUtils.getTier(tokenId);
    }

    function getCreatorNonce(uint256 tokenId) public pure returns (uint16 creatorNonce) {
        return TokenIdUtils.getCreatorNonce(tokenId);
    }

    function isRevealed(uint256 tokenId) public pure returns (bool) {
        return TokenIdUtils.isRevealed(tokenId);
    }

    function getRevealNonce(uint256 tokenId) public pure returns (uint16) {
        return TokenIdUtils.getRevealNonce(tokenId);
    }

    function isBridged(uint256 tokenId) public pure returns (bool) {
        return TokenIdUtils.isBridged(tokenId);
    }

    function getData(uint256 tokenId) public pure returns (IAsset.AssetData memory data) {
        return TokenIdUtils.getData(tokenId);
    }

    function TIER_MASK() public pure returns (uint256) {
        return TokenIdUtils.TIER_MASK;
    }

    function NONCE_MASK() public pure returns (uint256) {
        return TokenIdUtils.NONCE_MASK;
    }

    function REVEAL_NONCE_MASK() public pure returns (uint256) {
        return TokenIdUtils.REVEAL_NONCE_MASK;
    }

    function BRIDGED_MASK() public pure returns (uint256) {
        return TokenIdUtils.BRIDGED_MASK;
    }

    function TIER_SHIFT() public pure returns (uint256) {
        return TokenIdUtils.TIER_SHIFT;
    }

    function NONCE_SHIFT() public pure returns (uint256) {
        return TokenIdUtils.NONCE_SHIFT;
    }

    function REVEAL_NONCE_SHIFT() public pure returns (uint256) {
        return TokenIdUtils.REVEAL_NONCE_SHIFT;
    }

    function BRIDGED_SHIFT() public pure returns (uint256) {
        return TokenIdUtils.BRIDGED_SHIFT;
    }
}
