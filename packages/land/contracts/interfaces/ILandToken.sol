//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/// @title ILandToken
/// @author The Sandbox
/// @notice Interface of the LAND token including quad methods
interface ILandToken {
    /// @notice transfer multiple quad (aligned to a quad tree with size 3, 6, 12 or 24 only)
    /// @param from current owner of the quad
    /// @param to destination
    /// @param sizes list of sizes for each quad
    /// @param xs list of bottom left x coordinates for each quad
    /// @param ys list of bottom left y coordinates for each quad
    /// @param data additional data
    function batchTransferQuad(
        address from,
        address to,
        uint256[] calldata sizes,
        uint256[] calldata xs,
        uint256[] calldata ys,
        bytes calldata data
    ) external;

    /// @notice transfer one quad (aligned to a quad tree with size 3, 6, 12 or 24 only)
    /// @param from current owner of the quad
    /// @param to destination
    /// @param size size of the quad
    /// @param x The bottom left x coordinate of the quad
    /// @param y The bottom left y coordinate of the quad
    /// @param data additional data
    function transferQuad(address from, address to, uint256 size, uint256 x, uint256 y, bytes calldata data) external;

    /// @notice Transfer many tokens between 2 addresses.
    /// @param from The sender of the token.
    /// @param to The recipient of the token.
    /// @param ids The ids of the tokens.
    /// @param data Additional data.
    function batchTransferFrom(address from, address to, uint256[] calldata ids, bytes calldata data) external;

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
}
