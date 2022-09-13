//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

interface IPolygonLandTunnel {
    function batchTransferQuadToL1(
        address to,
        uint256[] calldata sizes,
        uint256[] calldata xs,
        uint256[] calldata ys,
        bytes memory data
    ) external;
}
