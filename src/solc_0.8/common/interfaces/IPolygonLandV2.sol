//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./IPolygonLand.sol";

interface IPolygonLandV2 is IPolygonLand {
    function isSuperOperator(address who) external view returns (bool);

    function mintAndTransferQuad(
        address to,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes calldata data
    ) external;
}
