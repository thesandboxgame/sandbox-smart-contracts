//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {IQuad} from "./IQuad.sol";

/// @title ILandToken
/// @author The Sandbox
/// @custom:security-contact contact-blockchain@sandbox.game
/// @notice Interface of the LAND token including quad methods
interface ILandToken is IQuad {
    /// @notice Mint a new quad (aligned to a quad tree with size 1, 3, 6, 12 or 24 only)
    /// @param to The recipient of the new quad
    /// @param size The size of the new quad
    /// @param x The bottom left x coordinate of the new quad
    /// @param y The bottom left y coordinate of the new quad
    /// @param data extra data to pass to the transfer
    function mintQuad(address to, uint256 size, uint256 x, uint256 y, bytes memory data) external;

    /// @notice Checks if a LAND exists by its coordinates
    /// @param size size of the quad
    /// @param x x coordinate
    /// @param y y coordinate
    /// @return does the LAND exist
    function exists(uint256 size, uint256 x, uint256 y) external view returns (bool);

    /// @notice total width of the map
    /// @return width
    function width() external pure returns (uint256);
}
