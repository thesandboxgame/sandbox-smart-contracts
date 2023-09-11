//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title IRoyaltyUGC
/// @notice interface define function for managing creator of UGC (User-Generated Content)
interface IRoyaltyUGC {
    ///@notice Gets the address of the creator associated with a specific token.
    ///@param tokenId the Id of token to retrieve the creator address for
    ///@return creator the address of creator
    function getCreatorAddress(uint256 tokenId) external pure returns (address creator);
}
