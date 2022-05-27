//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {TileLib} from "../../common/Libraries/TileLib.sol"; // TODO: Separate this code into a library + something to store the masks

contract TileTester {
    using TileLib for TileLib.Tile;
    TileLib.Tile[30] internal tiles;
    TileLib.Corner[10] internal neighbours;

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

    function findAPixel(uint256 idx) external view returns (TileLib.Tile memory) {
        return tiles[idx].findAPixel();
    }

    function setFindAPixel(uint256 idx, uint256 out) external {
        tiles[out] = tiles[idx].findAPixel();
    }

    function grow(uint256 idx)
        external
        view
        returns (
            TileLib.Tile memory tile,
            TileLib.Tile memory left,
            TileLib.Tile memory right,
            TileLib.CornerLine memory up,
            TileLib.CornerLine memory down
        )
    {
        TileLib.Corner memory corners;
        (tile, corners) = tiles[idx].grow();
        return (tile, corners.left, corners.right, corners.up, corners.down);
    }

    function growNeighbours(uint256 idx, uint256 out) external {
        (tiles[out], neighbours[out]) = tiles[idx].grow();
    }

    function getCorner(uint256 idx)
        external
        view
        returns (
            TileLib.Tile memory left,
            TileLib.Tile memory right,
            TileLib.CornerLine memory up,
            TileLib.CornerLine memory down
        )
    {
        return (neighbours[idx].left, neighbours[idx].right, neighbours[idx].up, neighbours[idx].down);
    }

    function setGrow(uint256 idx, uint256 out) external {
        (tiles[out], neighbours[out]) = tiles[idx].grow();
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
