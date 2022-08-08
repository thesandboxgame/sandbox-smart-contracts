//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {TileOrLandLib} from "../../common/Libraries/TileOrLandLib.sol";

contract TileOrLandTester {
    using TileOrLandLib for TileOrLandLib.TileOrLand;
    TileOrLandLib.TileOrLand[30] internal tiles;

    // TODO: Used by the mock, review if needed, see setTile
    function addIfNotContain(
        uint256 idx,
        uint256 x,
        uint256 y
    ) external {
        (bool success, TileOrLandLib.TileOrLand memory ret) = tiles[idx].addIfNotContain(x, y);
        require(success, "already contain");
        tiles[idx] = ret;
    }

    // TODO: used by Game, review if needed, see addIfNotContain
    function setTile(uint256 idx, TileOrLandLib.TileOrLand calldata data) external {
        // require(data.isValid(), "invalid tile");
        tiles[idx] = data;
    }

    function getTile(uint256 idx) external view returns (TileOrLandLib.TileOrLand memory) {
        return tiles[idx];
    }

    function isEmpty(uint256 idx) external view returns (bool) {
        return tiles[idx].isEmpty();
    }

    function isOneLand(uint256 idx) external view returns (bool) {
        return tiles[idx].isOneLand();
    }

    function isMultiLand(uint256 idx) external view returns (bool) {
        return tiles[idx].isMultiLand();
    }

    function isValid(uint256 idx) external view returns (bool) {
        return tiles[idx].isValid();
    }

    function isAdjacent(uint256 idx) external view returns (bool) {
        return tiles[idx].isAdjacent();
    }

    function getX(uint256 idx) external view returns (uint256) {
        return tiles[idx].getX();
    }

    function getY(uint256 idx) external view returns (uint256) {
        return tiles[idx].getY();
    }
}
