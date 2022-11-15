//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

/**
 * @title IPolygonLandTunnel
 * @author The Sandbox
 * @notice Interface of the LAND tunnel on the child chain
 */
interface IPolygonLandTunnel {
    /**
     * @notice Withdraw multiple quads to the root chain
     * @param to the recipient
     * @param sizes size of the quads
     * @param xs x of the quads
     * @param ys y of the quads
     * @param data extra data
     */
    function batchTransferQuadToL1(
        address to,
        uint256[] calldata sizes,
        uint256[] calldata xs,
        uint256[] calldata ys,
        bytes memory data
    ) external;
}
