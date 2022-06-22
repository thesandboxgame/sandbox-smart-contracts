//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {EstateGameRecordLib} from "../estate/EstateGameRecordLib.sol";
import {MapLib} from "../common/Libraries/MapLib.sol";
import {TileWithCoordLib} from "../common/Libraries/TileWithCoordLib.sol";

contract EstateGameRecordLibTester {
    using EstateGameRecordLib for EstateGameRecordLib.Games;
    using MapLib for MapLib.Map;
    EstateGameRecordLib.Games[30] internal games;

    function createGame(uint256 idx, uint256 gameId) external {
        require(games[idx].createGame(gameId), "already exists");
    }

    function deleteGame(uint256 idx, uint256 gameId) external {
        require(games[idx].deleteGame(gameId), "not found");
    }

    function setQuad(
        uint256 idx,
        uint256 gameId,
        uint256 x,
        uint256 y,
        uint256 size
    ) external {
        games[idx].getMap(gameId).set(x, y, size);
    }

    function setTileWithCoord(
        uint256 idx,
        uint256 gameId,
        TileWithCoordLib.TileWithCoord calldata tile
    ) external {
        games[idx].getMap(gameId).set(tile);
    }

    function setMap(
        uint256 idx,
        uint256 gameId,
        uint256 contained
    ) external {
        games[idx].getMap(gameId).set(games[idx].getMap(contained));
    }

    function clearQuad(
        uint256 idx,
        uint256 gameId,
        uint256 x,
        uint256 y,
        uint256 size
    ) external {
        games[idx].getMap(gameId).clear(x, y, size);
    }

    function clearTileWithCoord(
        uint256 idx,
        uint256 gameId,
        TileWithCoordLib.TileWithCoord calldata tile
    ) external {
        games[idx].getMap(gameId).clear(tile);
    }

    function clearMap(
        uint256 idx,
        uint256 gameId,
        uint256 contained
    ) external {
        games[idx].getMap(gameId).clear(games[idx].getMap(contained));
    }

    function clear(uint256 idx, uint256 gameId) external {
        games[idx].getMap(gameId).clear();
    }

    function contains(uint256 idx, uint256 gameId) external view returns (bool) {
        return games[idx].contains(gameId);
    }

    function getMapValues(uint256 idx, uint256 gameId)
        external
        view
        returns (TileWithCoordLib.TileWithCoord[] memory map)
    {
        return games[idx].getMap(gameId).values;
    }

    function mapLength(uint256 idx, uint256 gameId) external view returns (uint256) {
        return games[idx].getMap(gameId).length();
    }

    function mapVal(
        uint256 idx,
        uint256 gameId,
        uint256 mapIdx
    ) external view returns (TileWithCoordLib.TileWithCoord memory) {
        return games[idx].getMap(gameId).at(mapIdx);
    }

    function getMapIndex(
        uint256 idx,
        uint256 gameId,
        uint256 mapIdx
    ) external view returns (uint256) {
        return games[idx].getMap(gameId).indexes[mapIdx];
    }

    function cant(uint256 idx) external view returns (uint256) {
        return games[idx].length();
    }

    function getGameIdAt(uint256 idx, uint256 gameIdx) external view returns (uint256) {
        return games[idx].getGameIdAt(gameIdx);
    }

    function containCoord(
        uint256 idx,
        uint256 gameId,
        uint256 x,
        uint256 y
    ) external view returns (bool) {
        return games[idx].getMap(gameId).contain(x, y);
    }

    function containQuad(
        uint256 idx,
        uint256 gameId,
        uint256 x,
        uint256 y,
        uint256 size
    ) external view returns (bool) {
        return games[idx].getMap(gameId).contain(x, y, size);
    }

    function containMap(
        uint256 idx,
        uint256 gameId,
        uint256 contained
    ) external view returns (bool) {
        return games[idx].getMap(gameId).contain(games[idx].getMap(contained));
    }

    function isEqual(
        uint256 idx,
        uint256 gameId,
        uint256 other
    ) external view returns (bool) {
        return games[idx].getMap(gameId).isEqual(games[idx].getMap(other));
    }
}
