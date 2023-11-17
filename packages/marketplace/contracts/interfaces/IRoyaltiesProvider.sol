// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

// The IRoyaltiesProvider.Part.basisPoints represents percentages in base points: 2.5 % == 0.025 * 10000 == 250.
// We expect external contracts to return the values with this precision.
uint256 constant TOTAL_BASIS_POINTS = 10000;

/// @author The Sandbox
/// @title RoyaltiesProvider contract interface
/// @notice Contains the signature for the getRoyalties function
interface IRoyaltiesProvider {
    struct Part {
        address account;
        uint256 basisPoints;
    }

    /// @notice Calculates all royalties in token for tokenId
    /// @param token Address of token
    /// @param tokenId of the token we want to calculate royalties
    /// @return A part with all royalties for token
    function getRoyalties(address token, uint256 tokenId) external returns (Part[] memory);
}
