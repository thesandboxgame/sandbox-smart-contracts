//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {PolygonAssetERC1155} from "../polygon/child/asset/PolygonAssetERC1155.sol";
import "../asset/libraries/ERC1155ERC721Helper.sol";
import {IOperatorFilterRegistry} from "../OperatorFilterer/interfaces/IOperatorFilterRegistry.sol";

contract MockPolygonAssetERC1155 is PolygonAssetERC1155 {
    function setOperatorRegistry(address registry) external {
        operatorFilterRegistry = IOperatorFilterRegistry(registry);
    }

    function registerAndSubscribe(address subsciption) external {
        operatorFilterRegistry.registerAndSubscribe(address(this), subsciption);
    }

    function setApprovalForAllWithOutFilter(address operator, bool approved) external {
        super._setApprovalForAll(_msgSender(), operator, approved);
    }

    function mintWithOutBouncerCheck(
        address creator,
        uint40 packId,
        bytes32 hash,
        uint256 supply,
        address owner,
        bytes calldata data
    ) external returns (uint256 id) {
        require(hash != 0, "HASH==0");
        require(owner != address(0), "TO==0");
        id = _generateTokenId(creator, supply, packId, supply == 1 ? 0 : 1, 0);
        uint256 uriId = id & ERC1155ERC721Helper.URI_ID;
        require(uint256(_metadataHash[uriId]) == 0, "ID_TAKEN");
        _metadataHash[uriId] = hash;
        _mint(_msgSender(), owner, id, supply, data);
    }
}
