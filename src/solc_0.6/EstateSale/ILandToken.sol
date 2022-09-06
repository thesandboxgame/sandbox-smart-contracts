// SPDX-License-Identifier: MIT

pragma solidity 0.6.5;


interface ILandToken {
    function mintQuad(
        address to,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes calldata data
    ) external;
}
