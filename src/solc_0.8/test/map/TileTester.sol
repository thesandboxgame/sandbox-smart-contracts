//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {TileLib} from "../../common/Libraries/TileLib.sol"; // TODO: Separate this code into a library + something to store the masks

contract TileTester {
    using TileLib for TileLib.Tile;
    TileLib.Tile[30] internal tiles;
    TileLib.ExtendedTile[10] internal neighbours;

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

    function getTile(uint256 idx) external view returns (TileLib.Tile memory) {
        return tiles[idx];
    }

    function setFindAPixel(uint256 idx, uint256 out) external {
        tiles[out] = tiles[idx].findAPixel();
    }

    function grow(uint256 idx) external view returns (TileLib.ExtendedTile memory tile) {
        return tiles[idx].grow();
    }

    function growNeighbours(uint256 idx, uint256 out) external {
        neighbours[out] = tiles[idx].grow();
    }

    function findAPixel(uint256 idx)
        external
        view
        returns (TileLib.Tile memory current, TileLib.ExtendedTile memory next)
    {
        TileLib.ExtendedTile memory ret;
        ret.center.middle = tiles[idx].findAPixel();
        return (tiles[idx], ret);
    }

    function floodStep(TileLib.Tile calldata data)
        external
        pure
        returns (TileLib.Tile memory current, TileLib.ExtendedTile memory next)
    {
        TileLib.ExtendedTile memory corners = data.grow();
        return (data, corners);
    }

    function isAdjacent(uint256 idx) external view returns (bool ret) {
        TileLib.Tile memory next = tiles[idx].findAPixel();
        TileLib.ExtendedTile memory current;
        bool done;
        while (!done) {
            current = next.grow();
            // Ignore overflow area
            current.center.middle = current.center.middle.and(tiles[idx]);
            done = next.isEqual(current.center.middle);
            next = current.center.middle;
        }
        return next.isEqual(tiles[idx]);
    }

    function getCorner(uint256 idx) external view returns (TileLib.ExtendedTile memory) {
        return neighbours[idx];
    }

    function setGrow(uint256 idx, uint256 out) external {
        neighbours[out] = tiles[idx].grow();
    }

    function union(uint256[] calldata idxs, uint256 idxOut) external {
        TileLib.Tile memory t;
        for (uint256 i = 0; i < idxs.length; i++) {
            t = t.or(tiles[idxs[i]]);
        }
        tiles[idxOut] = t;
    }

    function intersection(uint256[] calldata idxs, uint256 idxOut) external {
        TileLib.Tile memory t = tiles[idxs[0]];
        for (uint256 i = 1; i < idxs.length; i++) {
            t = t.and(tiles[idxs[i]]);
        }
        tiles[idxOut] = t;
    }

    function isEqual(uint256 idx1, uint256 idx2) external view returns (bool) {
        return tiles[idx1].isEqual(tiles[idx2]);
    }

    function containQuad(
        uint256 idx,
        uint256 x,
        uint256 y,
        uint256 size
    ) external view returns (bool) {
        return tiles[idx].containQuad(x, y, size);
    }
}
