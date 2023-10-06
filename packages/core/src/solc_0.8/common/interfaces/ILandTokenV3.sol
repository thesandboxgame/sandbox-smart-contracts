//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./ILandTokenV2.sol";

interface ILandTokenV3 is ILandTokenV2 {
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        bytes memory data
    ) external;

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        bytes calldata data
    ) external;

    function safeTransferFrom(
        address from,
        address to,
        uint256 id
    ) external;
}
