//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {TileWithCoordLib} from "../../common/Libraries/TileWithCoordLib.sol";
import {TileLib} from "../../common/Libraries/TileLib.sol";

contract TileWithCoordTester {
    using TileWithCoordLib for TileWithCoordLib.TileWithCoord;
    using TileLib for TileLib.Tile;
    TileWithCoordLib.TileWithCoord[30] public tiles;

    function initTileWithCoord(
        uint256 idx,
        uint256 x,
        uint256 y
    ) external {
        tiles[idx] = TileWithCoordLib.init(x, y);
    }

    function setQuad(
        uint256 idx,
        uint256 x,
        uint256 y,
        uint256 size
    ) external {
        tiles[idx] = tiles[idx].set(x, y, size);
    }

    function clearQuad(
        uint256 idx,
        uint256 x,
        uint256 y,
        uint256 size
    ) external {
        tiles[idx] = tiles[idx].clear(x, y, size);
    }

    function merge(uint256 src, uint256 value) external {
        tiles[src] = tiles[src].merge(tiles[value]);
    }

    function clear(uint256 src, uint256 value) external {
        tiles[src] = tiles[src].clear(tiles[value]);
    }

    function containQuad(
        uint256 idx,
        uint256 x,
        uint256 y,
        uint256 size
    ) external view returns (bool) {
        return tiles[idx].contain(x, y, size);
    }

    function containCoord(
        uint256 idx,
        uint256 x,
        uint256 y
    ) external view returns (bool) {
        return tiles[idx].contain(x, y);
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

    function getLandCount(uint256 idx) external view returns (uint256) {
        return tiles[idx].countBits();
    }

    function countBits(uint256 x) external pure returns (uint256) {
        x = x - ((x >> 1) & 0x0000000000000000555555555555555555555555555555555555555555555555);
        x =
            (x & 0x0000000000000000333333333333333333333333333333333333333333333333) +
            ((x >> 2) & 0x0000000000000000333333333333333333333333333333333333333333333333);
        x = (x + (x >> 4)) & 0x00000000000000000F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F;
        return
            ((((x >> 96) * 0x010101010101010101010101) +
                ((x & 0x0F0F0F0F0F0F0F0F0F0F0F0F) * 0x010101010101010101010101)) >> (11 * 8)) & 0xFF;
    }

    function isEmpty(uint256 idx) external view returns (bool) {
        return tiles[idx].isEmpty();
    }

    function isEqual(uint256 idx1, uint256 idx2) external view returns (bool) {
        return tiles[idx1].isEqual(tiles[idx2]);
    }

    function setFindAPixel(uint256 idx, uint256 out) external {
        tiles[out].tile = tiles[idx].tile.findAPixel();
    }

    struct ExtendedTile {
        TileLib.Tile left;
        uint256 up;
        TileLib.Tile middle;
        uint256 down;
        TileLib.Tile right;
    }

    function isAdjacent(uint256 idx) external view returns (bool ret) {
        TileLib.Tile memory next = tiles[idx].tile.findAPixel();
        ExtendedTile memory current;
        bool done;
        while (!done) {
            current = _grow(next);
            // Ignore overflow area
            current.middle = current.middle.and(tiles[idx].tile);
            done = next.isEqual(current.middle);
            next = current.middle;
        }
        return next.isEqual(tiles[idx].tile);
    }

    function grow(uint256 idx) external view returns (ExtendedTile memory e) {
        return _grow(tiles[idx].tile);
    }

    uint256 private constant LEFT_MASK = 0x000001000001000001000001000001000001000001000001;
    uint256 private constant LEFT_MASK_NEG = ~LEFT_MASK;
    uint256 private constant RIGHT_MASK = 0x800000800000800000800000800000800000800000800000;
    uint256 private constant RIGHT_MASK_NEG = ~RIGHT_MASK;
    uint256 private constant UP_MASK = 0x000000000000000000000000000000000000000000FFFFFF;
    uint256 private constant DOWN_MASK = 0xFFFFFF000000000000000000000000000000000000000000;

    function _grow(TileLib.Tile memory self) internal pure returns (ExtendedTile memory e) {
        e.middle.data[0] = _grow(self.data[0]) | ((self.data[1] & UP_MASK) << (24 * 7));
        e.middle.data[1] =
            _grow(self.data[1]) |
            ((self.data[2] & UP_MASK) << (24 * 7)) |
            ((self.data[0] & DOWN_MASK) >> (24 * 7));
        e.middle.data[2] = _grow(self.data[2]) | ((self.data[1] & DOWN_MASK) >> (24 * 7));

        e.up = (self.data[0] & UP_MASK) << (24 * 7);
        e.down = (self.data[2] & DOWN_MASK) >> (24 * 7);
        // for loop removed to save some gas.
        e.left.data[0] = (self.data[0] & LEFT_MASK) << 23;
        e.right.data[0] = (self.data[0] & RIGHT_MASK) >> 23;
        e.left.data[1] = (self.data[1] & LEFT_MASK) << 23;
        e.right.data[1] = (self.data[1] & RIGHT_MASK) >> 23;
        e.left.data[2] = (self.data[2] & LEFT_MASK) << 23;
        e.right.data[2] = (self.data[2] & RIGHT_MASK) >> 23;
        return e;
    }

    function _grow(uint256 x) private pure returns (uint256) {
        return (x | ((x & RIGHT_MASK_NEG) << 1) | ((x & LEFT_MASK_NEG) >> 1) | (x << 24) | (x >> 24));
    }
}
