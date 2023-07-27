//SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "./IRoyaltyUGC.sol";

interface ITokenUtils is IRoyaltyUGC {
    function getTier(uint256 tokenId) external pure returns (uint8 tier);

    function isRevealed(uint256 tokenId) external pure returns (bool);

    function getCreatorNonce(uint256 tokenId) external pure returns (uint16);

    function getRevealNonce(uint256 tokenId) external pure returns (uint16);

    function isBridged(uint256 tokenId) external pure returns (bool);
}
