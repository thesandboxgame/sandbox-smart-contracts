//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IRoyaltyUGC {
    /// @notice Extracts the creator address from a given token id
    /// @param tokenId The token id to extract the creator address from
    /// @return creator The asset creator address
    function getCreatorAddress(uint256 tokenId) external pure returns (address creator);
}
