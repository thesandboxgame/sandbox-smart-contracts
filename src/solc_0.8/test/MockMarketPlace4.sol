//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;
import {IAssetERC721} from "../common/interfaces/IAssetERC721.sol";
import {IAssetERC1155} from "../common/interfaces/IAssetERC1155.sol";

contract MockMarketPlace4 {
    function transferTokenForERC1155(
        address asset,
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) external {
        IAssetERC1155(asset).safeTransferFrom(from, to, id, amount, data);
    }

    function transferTokenERC721(
        address asset,
        address from,
        address to,
        uint256 id
    ) external {
        IAssetERC721(asset).safeTransferFrom(from, to, id);
    }

    function batchTransferTokenERC1155(
        address asset,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) external {
        IAssetERC1155(asset).safeBatchTransferFrom(from, to, ids, amounts, data);
    }

    function batchTransferTokenERC721(
        address asset,
        address from,
        address to,
        uint256[] memory ids,
        bytes memory data
    ) external {
        IAssetERC721(asset).safeBatchTransferFrom(from, to, ids, data);
    }
}
