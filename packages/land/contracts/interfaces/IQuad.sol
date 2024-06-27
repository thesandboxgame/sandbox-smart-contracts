//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/// @title IQuad
/// @author The Sandbox
/// @custom:security-contact contact-blockchain@sandbox.game
/// @notice Interface of the LAND token (quad methods)
interface IQuad {
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
}
