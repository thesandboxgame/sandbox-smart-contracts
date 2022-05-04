//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {MapLib} from "../../common/Libraries/MapLib.sol";
import {TileWithCoordLib} from "../../common/Libraries/TileWithCoordLib.sol";

contract MapTester {
    using MapLib for MapLib.Map;
    MapLib.Map[30] internal maps;

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

    function containMap(uint256 idx, uint256 contained) external view returns (bool) {
        return maps[idx].containMap(maps[contained]);
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
