//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {TileWithCoordLib} from "../Libraries/TileWithCoordLib.sol";

interface IPremiumLandRegistry {
    /// @notice Check if the bit in certain coordinate are set or not inside the map
    /// @param x the x coordinate
    /// @param y the  coordinate
    /// @return true if the x,y coordinate bit is set or false if it is cleared
    function isPremium(uint256 x, uint256 y) external view returns (bool);

    /// @notice Check if a map is empty (no bits are set)
    /// @return true if the map is empty
    function isEmpty() external view returns (bool);

    /// @notice Count the amount of premium lands inside the Map filtered by a quad
    /// @dev the coordinates must be % size and size can be 1, 3, 6, 12 and 24 to match the Quads in the land contract
    /// @param x the x coordinate of the square
    /// @param y the y coordinate of the square
    /// @param size the size of the square
    /// @return the amount of premium lands
    function countPremium(
        uint256 x,
        uint256 y,
        uint256 size
    ) external view returns (uint256);

    /// @notice Count the amount of premium lands inside the Map filtered by a tile
    /// @param tile the tile with coord used to intersect with the premium map
    /// @return the amount of premium lands
    function countPremium(TileWithCoordLib.TileWithCoord memory tile) external view returns (uint256);
}
