// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

// The IRoyaltiesProvider.Part.value represents percentages in base points: 2.5 % == 0.025 * 10000 == 250.
// We expect external contracts to return the values with this precision.
uint256 constant BASIS_POINTS = 10000;

/// @title interface for the RoyaltiesProvider contract
/// @notice contains the signature for the getRoyalties function
interface IRoyaltiesProvider {
    struct Part {
        address account;
        uint256 value;
    }

    /// @notice calculates all roaylties in token for tokenId
    /// @param token address of token
    /// @param tokenId of the token we want to calculate royalites
    /// @return a LibPart.Part with allroyalties for token
    function getRoyalties(address token, uint256 tokenId) external returns (Part[] memory);
}
