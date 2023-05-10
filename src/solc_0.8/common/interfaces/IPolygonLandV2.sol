//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./IPolygonLand.sol";

/**
 * @title IPolygonLandV2
 * @author The Sandbox
 * @notice Interface of the LAND v2 based on IPolygonLand
 */
interface IPolygonLandV2 is IPolygonLand {
    /**
     * @notice Checks if an address if an operator
     * @param who address checked
     * @return is it super operator
     */
    function isSuperOperator(address who) external view returns (bool);

    /**
     * @notice Checks if a parent quad has child quads already minted.
     *  Then mints the rest child quads and transfers the parent quad.
     *  Should only be called by the tunnel.
     * @param to The recipient of the new quad
     * @param size The size of the new quad
     * @param x The top left x coordinate of the new quad
     * @param y The top left y coordinate of the new quad
     * @param data extra data to pass to the transfer
     */
    function mintAndTransferQuad(
        address to,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes calldata data
    ) external;
}
