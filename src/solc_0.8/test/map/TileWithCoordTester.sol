//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {TileWithCoordLib} from "../../common/Libraries/TileWithCoordLib.sol"; // TODO: Separate this code into a library + something to store the masks

contract TileWithCoordTester {
    using TileWithCoordLib for TileWithCoordLib.TileWithCoord;
    TileWithCoordLib.TileWithCoord[30] public tiles;

    function initTileWithCoord(
        uint256 idx,
        uint256 x,
        uint256 y
    ) external {
        tiles[idx] = TileWithCoordLib.initTileWithCoord(x, y);
    }

    function setQuad(
        uint256 idx,
        uint256 x,
        uint256 y,
        uint256 size
    ) external {
        tiles[idx] = tiles[idx].setQuad(x, y, size);
    }

    function clearQuad(
        uint256 idx,
        uint256 x,
        uint256 y,
        uint256 size
    ) external {
        tiles[idx] = tiles[idx].clearQuad(x, y, size);
    }

    function merge(uint256 src, uint256 value) external {
        tiles[src] = tiles[src].merge(tiles[value]);
    }

    function subtract(uint256 src, uint256 value) external {
        tiles[src] = tiles[src].subtract(tiles[value]);
    }

    function containQuad(
        uint256 idx,
        uint256 x,
        uint256 y,
        uint256 size
    ) external view returns (bool) {
        return tiles[idx].containQuad(x, y, size);
    }

    function getTile(uint256 idx) external view returns (TileWithCoordLib.TileWithCoord memory) {
        return tiles[idx];
    }

    function getX(uint256 idx) external view returns (uint256) {
        return tiles[idx].getX();
    }

    function getY(uint256 idx) external view returns (uint256) {
        return tiles[idx].getY();
    }

    function getKey(uint256 idx) external view returns (uint256) {
        return tiles[idx].getKey();
    }

    function isEmpty(uint256 idx) external view returns (bool) {
        return tiles[idx].isEmpty();
    }
}
