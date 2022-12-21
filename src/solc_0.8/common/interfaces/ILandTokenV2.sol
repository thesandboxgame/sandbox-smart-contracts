//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./ILandToken.sol";

interface ILandTokenV2 is ILandToken {
    function isSuperOperator(address who) external view returns (bool);

    function exists(
        uint256 size,
        uint256 x,
        uint256 y
    ) external view returns (bool);

    function mintQuad(
        address to,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes calldata data
    ) external;

    function mintAndTransferQuad(
        address to,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes calldata data
    ) external;
}
