//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {EstateBaseToken} from "../estate/EstateBaseToken.sol";
import {TileLib} from "../common/Libraries/TileLib.sol";
import {TileWithCoordLib} from "../common/Libraries/TileWithCoordLib.sol";
import {MapLib} from "../common/Libraries/MapLib.sol";

contract TestEstateBaseToken is EstateBaseToken {
    constructor(
        address trustedForwarder,
        address admin,
        address landToken,
        uint16 chainIndex,
        string memory name_,
        string memory symbol_
    ) {
        initialize(trustedForwarder, admin, landToken, chainIndex, name_, symbol_);
    }

    function initialize(
        address trustedForwarder,
        address admin,
        address landToken,
        uint16 chainIndex,
        string memory name_,
        string memory symbol_
    ) public initializer {
        __ERC2771Context_init_unchained(trustedForwarder);
        __ERC721_init_unchained(name_, symbol_);
        __EstateBaseERC721_init_unchained(admin);
        __EstateBaseToken_init_unchained(landToken, chainIndex);
    }

    function update(
        uint256 oldId,
        uint256[][3] calldata landToAdd,
        uint256[][3] calldata landToRemove
    ) external returns (uint256) {
        return _update(_msgSender(), oldId, landToAdd, landToRemove);
    }

    function getCurrentEstateId(uint256 storageId) external view returns (uint256) {
        return _estate(storageId).id;
    }

    function getBaseUri() external view returns (string memory) {
        return _baseURI();
    }

    function incrementTokenVersion(uint256 estateId) external returns (uint256 newEstateId) {
        newEstateId = _incrementTokenVersion(estateId);
        return (newEstateId);
    }

    function translateSquare(
        uint256 x,
        uint256 y,
        uint256 size
    ) external pure returns (MapLib.TranslateResult memory) {
        TileLib.Tile memory t;
        return MapLib.translate(TileLib.set(t, 0, 0, size), x, y);
    }

    function getTileWithCoord(uint256 x, uint256 y) external pure returns (TileWithCoordLib.TileWithCoord[] memory) {
        TileWithCoordLib.TileWithCoord[] memory tiles = new TileWithCoordLib.TileWithCoord[](1);
        tiles[0] = TileWithCoordLib.set(TileWithCoordLib.init(x, y), x, y, 24);
        return tiles;
    }
}
