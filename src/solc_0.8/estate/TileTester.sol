//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {TileLib} from "./TileLib.sol"; // TODO: Separate this code into a library + something to store the masks

// TODO: Check if a pure function is better than a mapping for the masks
contract TileTester {
    using TileLib for TileLib.Tile;
    mapping(uint256 => uint256) public quadMap;
    TileLib.Tile[30] tile;

    constructor() {
        quadMap[1] = 1;
        quadMap[3] = 2 ** 3 - 1;
        quadMap[6] = 2 ** 6 - 1;
        quadMap[12] = 2 ** 12 - 1;
        quadMap[24] = 2 ** 24 - 1;
    }

    function setQuad(uint256 idx, uint256 x, uint256 y, uint256 size) external {
        tile[idx] = tile[idx].setQuad(x, y, size, _quadMask);
    }

    function clearQuad(uint256 idx, uint256 x, uint256 y, uint256 size) external {
        tile[idx] = tile[idx].clearQuad(x, y, size, _quadMask);
    }

    function getTile(uint256 idx) external view returns (TileLib.Tile memory) {
        return tile[idx];
    }

    function quadMask(uint256 size) external view returns (uint256) {
        return _quadMask(size);
    }

    function union(uint256[] calldata idxs, uint256 idxOut) external {
        TileLib.Tile memory t;
        for (uint256 i = 0; i < idxs.length; i++) {
            t = t.union(tile[idxs[i]]);
        }
        tile[idxOut] = t;
    }

    function intersection(uint256[] calldata idxs, uint256 idxOut) external {
        TileLib.Tile memory t = tile[idxs[0]];
        for (uint256 i = 1; i < idxs.length; i++) {
            t = t.intersection(tile[idxs[i]]);
        }
        tile[idxOut] = t;
    }

    function isEqual(uint256 idx1, uint256 idx2) external view returns (bool) {
        return tile[idx1].isEqual(tile[idx2]);
    }


    function containTile(uint256 idx1, uint256 idx2) external view returns (bool) {
        return tile[idx1].containTile(tile[idx2]);
    }

    function containQuad(uint256 idx, uint256 x, uint256 y, uint256 size) external view returns (bool) {
        return tile[idx].containQuad(x, y, size, _quadMask);
    }

    function _quadMask(uint256 size) internal view returns (uint256) {
        return quadMap[size];
    }

}
