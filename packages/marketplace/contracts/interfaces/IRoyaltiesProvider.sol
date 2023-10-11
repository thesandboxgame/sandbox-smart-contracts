// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {LibPart} from "../libraries/LibPart.sol";

/// @title interface for the RoyaltiesProvider contract
/// @notice contains the signature for the getRoyalties function
interface IRoyaltiesProvider {
    /// @notice calculates all roaylties in token for tokenId
    /// @param token address of token
    /// @param tokenId of the token we want to calculate royalites
    /// @return a LibPart.Part with allroyalties for token
    function getRoyalties(address token, uint256 tokenId) external returns (LibPart.Part[] memory);
}
