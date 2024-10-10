// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

contract QuadHelper {
    uint256 internal constant GRID_SIZE = 408;

    /// @notice return the quadId given and index, size and coordinates
    /// @param i the index to be added to x,y to get row and column
    /// @param size The bottom left x coordinate of the quad
    /// @param x The bottom left x coordinate of the quad
    /// @param y The bottom left y coordinate of the quad
    /// @return the tokenId of the quad
    /// @dev this method is gas optimized, must be called with verified x,y and size, after a call to _isValidQuad
    function idInPath(uint256 i, uint256 size, uint256 x, uint256 y) external pure returns (uint256) {
        unchecked {
            return (x + (i % size)) + (y + (i / size)) * GRID_SIZE;
        }
    }
}
