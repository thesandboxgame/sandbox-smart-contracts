//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {PolygonAssetERC721} from "../polygon/child/asset/PolygonAssetERC721.sol";
import {BaseERC721} from "../assetERC721/BaseERC721.sol";
import {IOperatorFilterRegistry} from "../OperatorFilterer/interfaces/IOperatorFilterRegistry.sol";

contract MockPolygonAssetERC721 is PolygonAssetERC721 {
    function setOperatorRegistry(address registry) external {
        operatorFilterRegistry = IOperatorFilterRegistry(registry);
    }

    function registerAndSubscribe(address subsciption) external {
        operatorFilterRegistry.registerAndSubscribe(address(this), subsciption);
    }

    function setApprovalForAllWithOutFilter(address operator, bool approved) external {
        super._setApprovalForAll(_msgSender(), operator, approved);
    }

    function mintWithOutMinterCheck(address to, uint256 id) external {
        BaseERC721.mint(to, id);
    }
}
