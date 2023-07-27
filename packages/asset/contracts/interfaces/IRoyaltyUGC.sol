//SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface IRoyaltyUGC {
    function getCreatorAddress(uint256 tokenId) external pure returns (address creator);
}
