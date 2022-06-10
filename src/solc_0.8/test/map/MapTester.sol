//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {MapLib} from "../../common/Libraries/MapLib.sol";
import {TileWithCoordLib} from "../../common/Libraries/TileWithCoordLib.sol";
import {TileLib} from "../../common/Libraries/TileLib.sol";

contract MapTester {
    using MapLib for MapLib.Map;
    using TileWithCoordLib for TileWithCoordLib.TileWithCoord;
    using TileLib for TileLib.Tile;
    MapLib.Map[30] internal maps;

    // TileLib.ExtendedTile[10] internal neighbours;

    function setQuad(
        uint256 idx,
        uint256 x,
        uint256 y,
        uint256 size
    ) external {
        maps[idx].setQuad(x, y, size);
    }

    function setTileWithCoord(uint256 idx, TileWithCoordLib.TileWithCoord calldata tile) external {
        maps[idx].setTileWithCoord(tile);
    }

    function setMap(uint256 idx, uint256 contained) external {
        maps[idx].setMap(maps[contained]);
    }

    function clearQuad(
        uint256 idx,
        uint256 x,
        uint256 y,
        uint256 size
    ) external {
        maps[idx].clearQuad(x, y, size);
    }

    function clearTileWithCoord(uint256 idx, TileWithCoordLib.TileWithCoord calldata tile) external {
        maps[idx].clearTileWithCoord(tile);
    }

    function clearMap(uint256 idx, uint256 contained) external {
        maps[idx].clearMap(maps[contained]);
    }

    function clear(uint256 idx) external {
        maps[idx].clear();
    }

    function containCoord(
        uint256 idx,
        uint256 x,
        uint256 y
    ) external view returns (bool) {
        return maps[idx].containCoord(x, y);
    }

    function containQuad(
        uint256 idx,
        uint256 x,
        uint256 y,
        uint256 size
    ) external view returns (bool) {
        return maps[idx].containQuad(x, y, size);
    }

    function isAdjacent(uint256 idx) external view returns (bool) {
        return maps[idx].isAdjacent();
    }

    function isQuadAdjacent(
        uint256 idx,
        uint256 x,
        uint256 y,
        uint256 size
    ) external view returns (bool) {
        return maps[idx].isAdjacent(x, y, size);
    }

    function floodStep(uint256 idx, TileLib.Tile[] memory data)
        external
        view
        returns (
            TileLib.Tile[] memory current,
            TileLib.Tile[] memory next,
            bool done
        )
    {
        (next, done) = maps[idx].floodStep(data);
        return (data, next, done);
    }

    function floodStepWithSpot(uint256 idx)
        external
        view
        returns (
            TileWithCoordLib.TileWithCoord[] memory current,
            TileLib.Tile[] memory next,
            bool done
        )
    {
        current = maps[idx].values;
        next = new TileLib.Tile[](current.length);
        next[0] = current[0].findAPixel();
        return (current, next, done);
    }

    function findAPixel(uint256 idx) external view returns (TileLib.Tile memory tile) {
        return maps[idx].values[0].findAPixel();
    }

    function containMap(uint256 idx, uint256 contained) external view returns (bool) {
        return maps[idx].containMap(maps[contained]);
    }

    function isEqual(uint256 idx, uint256 other) external view returns (bool) {
        return maps[idx].isEqual(maps[other].getMap());
    }

    function length(uint256 idx) external view returns (uint256) {
        return maps[idx].length();
    }

    function at(uint256 idx, uint256 index) external view returns (TileWithCoordLib.TileWithCoord memory) {
        return maps[idx].at(index);
    }

    function containTileAtCoord(
        uint256 idx,
        uint256 x,
        uint256 y
    ) external view returns (bool) {
        return maps[idx].containTileAtCoord(x, y);
    }
}
