// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/// @author The Sandbox
/// @title QuadHelper: A library for finding quad IDs
/// @notice This library contains utility functions for identifying quadrants within a predefined grid.
library QuadHelper {
    uint256 internal constant GRID_SIZE = 408;
    /* solhint-disable const-name-snakecase */
    uint256 internal constant LAYER = 0xFF00000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_1x1 = 0x0000000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_3x3 = 0x0100000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_6x6 = 0x0200000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_12x12 = 0x0300000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_24x24 = 0x0400000000000000000000000000000000000000000000000000000000000000;
    /* solhint-enable const-name-snakecase */
    
    /// @notice get the quad id given the layer and coordinates.
    /// @param layer the layer of the quad see: _getQuadLayer
    /// @param x The bottom left x coordinate of the quad
    /// @param y The bottom left y coordinate of the quad
    /// @return the tokenId of the quad
    /// @dev this method is gas optimized, must be called with verified x,y and size, after a call to _isValidQuad
    function getQuadId(uint256 layer, uint256 x, uint256 y) external pure returns (uint256) {
        unchecked {
            return layer + x + y * GRID_SIZE;
        }
    }
    /// @notice get size related information (there is one-to-one relationship between layer and size)
    /// @param size The size of the quad
    /// @return layer the layers that corresponds to the size
    /// @return parentSize the size of the parent (bigger quad that contains the current one)
    /// @return childLayer the layer of the child (smaller quad contained by this one)
    function getQuadLayer(uint256 size) external pure returns (uint256 layer, uint256 parentSize, uint256 childLayer) {
        if (size == 1) {
            layer = LAYER_1x1;
            parentSize = 3;
        } else if (size == 3) {
            layer = LAYER_3x3;
            parentSize = 6;
        } else if (size == 6) {
            layer = LAYER_6x6;
            parentSize = 12;
            childLayer = LAYER_3x3;
        } else if (size == 12) {
            layer = LAYER_12x12;
            parentSize = 24;
            childLayer = LAYER_6x6;
        } else {
            layer = LAYER_24x24;
            childLayer = LAYER_12x12;
        }
    }
}
