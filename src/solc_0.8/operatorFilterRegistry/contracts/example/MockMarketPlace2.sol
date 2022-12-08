//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {IERC1155} from "@openzeppelin/contracts-0.8/interfaces/IERC1155.sol";

contract MockMarketPlace2 {
    function transferToken(
        address asset,
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) external {
        IERC1155(asset).safeTransferFrom(from, to, id, amount, data);
    }

    function batchTransferToken(
        address asset,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) external {
        IERC1155(asset).safeBatchTransferFrom(from, to, ids, amounts, data);
    }
}
