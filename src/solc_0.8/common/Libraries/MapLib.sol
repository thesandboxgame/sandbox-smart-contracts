//SPDX-License-Identifier: MIT
/* solhint-disable code-complexity */
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {TileWithCoordLib} from "./TileWithCoordLib.sol";
// TODO: Moveit to a intermediate library
import {TileLib} from "./TileLib.sol";

library MapLib {
    using TileWithCoordLib for TileWithCoordLib.TileWithCoord;
    // TODO: Moveit to a intermediate library
    using TileLib for TileLib.Tile;

    uint256 private constant LEFT_MASK = 0x000001000001000001000001000001000001000001000001;
    uint256 private constant LEFT_MASK_NEG = ~LEFT_MASK;
    uint256 private constant RIGHT_MASK = 0x800000800000800000800000800000800000800000800000;
    uint256 private constant RIGHT_MASK_NEG = ~RIGHT_MASK;
    uint256 private constant UP_MASK = 0x000000000000000000000000000000000000000000FFFFFF;
    uint256 private constant DOWN_MASK = 0xFFFFFF000000000000000000000000000000000000000000;

    struct QuadsAndTiles {
        uint256[][3] quads; //(size, x, y)
        TileWithCoordLib.TileWithCoord[] tiles;
    }

    // To remove empty tiles we need to store the key (aka coords) inside the value
    // For now we will leave empty tiles in the structure
    struct Map {
        TileWithCoordLib.TileWithCoord[] values;
        // Position of the value in the `values` array, plus 1 because index 0
        // means a value is not in the set.
        mapping(uint256 => uint256) indexes;
    }

    function containCoord(
        Map storage self,
        uint256 x,
        uint256 y
    ) public view returns (bool) {
        uint256 key = TileWithCoordLib.getKey(x, y);
        uint256 idx = self.indexes[key];
        if (idx == 0) {
            // !contains
            return false;
        }
        return self.values[idx - 1].containCoord(x, y);
    }

    function containQuad(
        Map storage self,
        uint256 x,
        uint256 y,
        uint256 size
    ) public view returns (bool) {
        uint256 key = TileWithCoordLib.getKey(x, y);
        uint256 idx = self.indexes[key];
        if (idx == 0) {
            // !contains
            return false;
        }
        // TODO: We can call TileLib directly to use less gas ?
        return self.values[idx - 1].containQuad(x, y, size);
    }

    function containTileWithCoord(Map storage self, TileWithCoordLib.TileWithCoord memory tile)
        public
        view
        returns (bool)
    {
        uint256 key = tile.getKey();
        uint256 idx = self.indexes[key];
        if (idx == 0) {
            // !contains
            return false;
        }
        return self.values[idx - 1].containTile(tile);
    }

    function containTileWithOffset(
        Map storage self,
        TileLib.Tile memory tile,
        uint256 x,
        uint256 y
    ) public view returns (bool) {
        TileWithCoordLib.ShiftResult memory s = TileWithCoordLib.translateTile(tile, x, y);
        return
            (s.topLeft.isEmpty() || containTileWithCoord(self, s.topLeft)) &&
            (s.topRight.isEmpty() || containTileWithCoord(self, s.topRight)) &&
            (s.bottomLeft.isEmpty() || containTileWithCoord(self, s.bottomLeft)) &&
            (s.bottomRight.isEmpty() || containTileWithCoord(self, s.bottomRight));
    }

    // TODO: Check gas consumption!!!
    // OBS: self can be huge, but contained must be small, we iterate over contained values.
    function containMap(Map storage self, Map storage contained) public view returns (bool) {
        for (uint256 i; i < contained.values.length; i++) {
            if (!containTileWithCoord(self, contained.values[i])) {
                return false;
            }
        }
        return true;
    }

    function setQuad(
        Map storage self,
        uint256 x,
        uint256 y,
        uint256 size
    ) public {
        uint256 key = TileWithCoordLib.getKey(x, y);
        uint256 idx = self.indexes[key];
        if (idx == 0) {
            // !contains
            // Add a new tile
            TileWithCoordLib.TileWithCoord memory t = TileWithCoordLib.initTileWithCoord(x, y);
            self.values.push(t.setQuad(x, y, size));
            self.indexes[key] = self.values.length;
        } else {
            // contains
            self.values[idx - 1] = self.values[idx - 1].setQuad(x, y, size);
        }
    }

    function setTileWithCoord(Map storage self, TileWithCoordLib.TileWithCoord memory tile) public {
        uint256 key = tile.getKey();
        uint256 idx = self.indexes[key];
        if (idx == 0) {
            // !contains
            // Add a new tile
            self.values.push(tile);
            self.indexes[key] = self.values.length;
        } else {
            self.values[idx - 1] = self.values[idx - 1].merge(tile);
        }
    }

    function setMap(Map storage self, Map storage contained) public {
        for (uint256 i; i < contained.values.length; i++) {
            setTileWithCoord(self, contained.values[i]);
        }
    }

    function clearQuad(
        Map storage self,
        uint256 x,
        uint256 y,
        uint256 size
    ) public returns (bool) {
        uint256 key = TileWithCoordLib.getKey(x, y);
        uint256 idx = self.indexes[key];
        if (idx == 0) {
            // !contains, nothing to clear
            return false;
        }
        TileWithCoordLib.TileWithCoord memory t = self.values[idx - 1].clearQuad(x, y, size);
        if (t.isEmpty()) {
            _remove(self, idx, key);
        } else {
            self.values[idx - 1] = t;
        }
        return true;
    }

    function clearTileWithCoord(Map storage self, TileWithCoordLib.TileWithCoord memory tile) public returns (bool) {
        uint256 key = tile.getKey();
        uint256 idx = self.indexes[key];
        if (idx == 0) {
            // !contains
            return false;
        }
        TileWithCoordLib.TileWithCoord memory t = self.values[idx - 1].subtract(tile);
        if (t.isEmpty()) {
            _remove(self, idx, key);
        } else {
            self.values[idx - 1] = t;
        }
        return true;
    }

    function clearMap(Map storage self, Map storage contained) public {
        for (uint256 i; i < contained.values.length; i++) {
            clearTileWithCoord(self, contained.values[i]);
        }
    }

    function clear(Map storage self) public {
        for (uint256 i; i < self.values.length; i++) {
            delete self.indexes[self.values[i].getKey()];
        }
        delete self.values;
    }

    function isEmpty(Map storage self) public view returns (bool) {
        // We remove the tiles when they are empty
        return self.values.length == 0;
    }

    function isEqual(Map storage self, Map storage other) public view returns (bool) {
        return isEqual(self, other.values);
    }

    function isEqual(Map storage self, TileWithCoordLib.TileWithCoord[] memory other) public view returns (bool) {
        if (other.length != self.values.length) {
            return false;
        }
        uint256 cant = other.length;
        // Check that self contains the same set of tiles than other and they are equal
        for (uint256 i; i < cant; i++) {
            uint256 key = other[i].getKey();
            uint256 idx = self.indexes[key];
            if (idx == 0 || !self.values[idx - 1].isEqual(other[i])) {
                return false;
            }
        }
        return true;
    }

    function length(Map storage self) public view returns (uint256) {
        return self.values.length;
    }

    function at(Map storage self, uint256 index) public view returns (TileWithCoordLib.TileWithCoord memory) {
        return self.values[index];
    }

    function at(
        Map storage self,
        uint256 offset,
        uint256 limit
    ) public view returns (TileWithCoordLib.TileWithCoord[] memory) {
        TileWithCoordLib.TileWithCoord[] memory ret = new TileWithCoordLib.TileWithCoord[](limit);
        for (uint256 i; i < limit; i++) {
            ret[i] = self.values[offset + i];
        }
        return ret;
    }

    // This can be problematic if it grows too much !!!
    function getMap(Map storage self) public view returns (TileWithCoordLib.TileWithCoord[] memory) {
        return self.values;
    }

    // This can be problematic if it grows too much !!!
    function getLandCount(Map storage self) public view returns (uint256) {
        uint256 ret;
        for (uint256 i; i < self.values.length; i++) {
            ret += self.values[i].getLandCount();
        }
        return ret;
    }

    // Just for testing
    function containTileAtCoord(
        Map storage self,
        uint256 x,
        uint256 y
    ) public view returns (bool) {
        uint256 key = TileWithCoordLib.getKey(x, y);
        uint256 idx = self.indexes[key];
        return (idx != 0);
    }

    /// @dev Checks the full map to see if all the pixels are adjacent
    function isAdjacent(Map storage self) public view returns (bool ret) {
        TileLib.Tile[] memory spot = new TileLib.Tile[](self.values.length);
        // We assume that all self.values[] are non empty (we remove them if they are empty).
        spot[0] = self.values[0].findAPixel();
        bool done;
        while (!done) {
            (spot, done) = floodStep(self, spot);
        }
        uint256 len = self.values.length;
        uint256 i;
        for (; i < len; i++) {
            if (!self.values[i].isEqualIgnoreCoords(spot[i])) {
                return false;
            }
        }
        return true;
    }

    function floodStep(Map storage self, TileLib.Tile[] memory current)
        public
        view
        returns (TileLib.Tile[] memory next, bool done)
    {
        uint256 len = self.values.length;
        uint256 i;
        uint256 x;
        uint256 y;
        uint256 idx;
        TileLib.Tile memory ci;
        next = new TileLib.Tile[](len);
        // grow
        for (i; i < len; i++) {
            ci = current[i];
            // isEmpty
            if ((ci.data[0] | ci.data[1] | ci.data[2]) == 0) {
                continue;
            }
            x = self.values[i].getX() * 24;
            y = self.values[i].getY() * 24;

            // left
            if (x >= 24) {
                idx = _getIdx(self, x - 24, y);
                if (idx != 0) {
                    next[idx - 1].data[0] |= (ci.data[0] & LEFT_MASK) << 23;
                    next[idx - 1].data[1] |= (ci.data[1] & LEFT_MASK) << 23;
                    next[idx - 1].data[2] |= (ci.data[2] & LEFT_MASK) << 23;
                }
            }
            // up
            if (y >= 24) {
                idx = _getIdx(self, x, y - 24);
                if (idx != 0) {
                    next[idx - 1].data[2] |= (ci.data[0] & UP_MASK) << (24 * 7);
                }
            }
            // middle
            idx = _getIdx(self, x, y);
            if (idx != 0) {
                next[idx - 1].data[0] |= _grow(ci.data[0]) | ((ci.data[1] & UP_MASK) << (24 * 7));
                next[idx - 1].data[1] |=
                    _grow(ci.data[1]) |
                    ((ci.data[2] & UP_MASK) << (24 * 7)) |
                    ((ci.data[0] & DOWN_MASK) >> (24 * 7));
                next[idx - 1].data[2] |= _grow(ci.data[2]) | ((ci.data[1] & DOWN_MASK) >> (24 * 7));
            }
            // down
            idx = _getIdx(self, x, y + 24);
            if (idx != 0) {
                next[idx - 1].data[0] |= (ci.data[2] & DOWN_MASK) >> (24 * 7);
            }
            // right
            idx = _getIdx(self, x + 24, y);
            if (idx != 0) {
                next[idx - 1].data[0] |= (ci.data[0] & RIGHT_MASK) >> 23;
                next[idx - 1].data[1] |= (ci.data[1] & RIGHT_MASK) >> 23;
                next[idx - 1].data[2] |= (ci.data[2] & RIGHT_MASK) >> 23;
            }
        }
        // Mask it.
        done = true;
        for (i = 0; i < len; i++) {
            // next[i] = next[i].and(self.values[i].tile);
            // done = done && next[i].isEqual(current[i]);
            next[i].data[0] &= self.values[i].tile.data[0];
            next[i].data[1] &= self.values[i].tile.data[1];
            next[i].data[2] &= self.values[i].tile.data[2];
            done =
                done &&
                next[i].data[0] == current[i].data[0] &&
                next[i].data[1] == current[i].data[1] &&
                next[i].data[2] == current[i].data[2];
        }
        return (next, done);
    }

    /// @dev check if a quad is adjacent to the current map (used to add a quad to a map). Cheaper than isAdjacent(map)
    function isAdjacent(
        Map storage self,
        uint256 x,
        uint256 y,
        uint256 size
    ) public view returns (bool) {
        if (isEmpty(self)) {
            return true;
        }

        uint256 idx;
        //        TileWithCoordLib.TileWithCoord memory spot = TileWithCoordLib.initTileWithCoord(x, y);
        //        TileLib.ExtendedTile memory corners = spot.setQuad(x, y, size).grow();
        TileLib.Tile memory spot;
        spot = spot.setQuad(x % 24, y % 24, size);
        // left
        if (x >= 24) {
            idx = _getIdx(self, x - 24, y);
            if (idx != 0 && !self.values[idx - 1].tile.and(_growLeft(spot)).isEmpty()) {
                return true;
            }
        }
        // up
        if (y >= 24) {
            idx = _getIdx(self, x, y - 24);
            if (idx != 0 && (self.values[idx - 1].tile.data[0] & ((spot.data[0] & UP_MASK) << (24 * 7))) != 0) {
                return true;
            }
        }
        // middle
        idx = _getIdx(self, x, y);
        if (idx != 0 && !self.values[idx - 1].tile.and(_growMiddle(spot)).isEmpty()) {
            return true;
        }
        // down
        idx = _getIdx(self, x, y + 24);
        if (idx != 0 && (self.values[idx - 1].tile.data[2] & ((spot.data[2] & DOWN_MASK) >> (24 * 7))) != 0) {
            return true;
        }
        // right
        idx = _getIdx(self, x + 24, y);
        if (idx != 0 && !self.values[idx - 1].tile.and(_growRight(spot)).isEmpty()) {
            return true;
        }
        return false;
    }

    function moveTo(
        Map storage self,
        Map storage other,
        QuadsAndTiles calldata data
    ) public {
        moveTo(self, other, data.quads);
        moveTo(self, other, data.tiles);
    }

    function add(Map storage self, QuadsAndTiles calldata data) public {
        add(self, data.quads);
        add(self, data.tiles);
    }

    function remove(Map storage self, QuadsAndTiles calldata data) public {
        remove(self, data.quads);
        remove(self, data.tiles);
    }

    function moveTo(
        Map storage from,
        Map storage to,
        TileWithCoordLib.TileWithCoord[] calldata tiles
    ) public {
        for (uint256 i; i < tiles.length; i++) {
            require(containTileWithCoord(from, tiles[i]), "Tile missing");
            clearTileWithCoord(from, tiles[i]);
            setTileWithCoord(to, tiles[i]);
        }
    }

    function add(Map storage self, TileWithCoordLib.TileWithCoord[] calldata tiles) public {
        for (uint256 i; i < tiles.length; i++) {
            setTileWithCoord(self, tiles[i]);
        }
    }

    function remove(Map storage self, TileWithCoordLib.TileWithCoord[] calldata tiles) public {
        for (uint256 i; i < tiles.length; i++) {
            require(containTileWithCoord(self, tiles[i]), "Tile missing");
            clearTileWithCoord(self, tiles[i]);
        }
    }

    function moveTo(
        Map storage from,
        Map storage to,
        uint256[][3] calldata quads
    ) public {
        require(quads[0].length == quads[1].length && quads[0].length == quads[2].length, "Invalid data");
        for (uint256 i; i < quads[0].length; i++) {
            require(containQuad(from, quads[1][i], quads[2][i], quads[0][i]), "Quad missing");
            clearQuad(from, quads[1][i], quads[2][i], quads[0][i]);
            setQuad(to, quads[1][i], quads[2][i], quads[0][i]);
        }
    }

    function add(Map storage self, uint256[][3] calldata quads) public {
        require(quads[0].length == quads[1].length && quads[0].length == quads[2].length, "Invalid data");
        for (uint256 i; i < quads[0].length; i++) {
            setQuad(self, quads[1][i], quads[2][i], quads[0][i]);
        }
    }

    function remove(Map storage self, uint256[][3] calldata quads) public {
        require(quads[0].length == quads[1].length && quads[0].length == quads[2].length, "Invalid data");
        for (uint256 i; i < quads[0].length; i++) {
            // TODO: We can skip this check ?
            require(containQuad(self, quads[1][i], quads[2][i], quads[0][i]), "Quad missing");
            clearQuad(self, quads[1][i], quads[2][i], quads[0][i]);
        }
    }

    function _remove(
        Map storage self,
        uint256 idx,
        uint256 key
    ) private {
        // TODO: We remove an empty tile, maybe is just better to leave it there ?
        uint256 toDeleteIndex = idx - 1;
        uint256 lastIndex = self.values.length - 1;
        if (lastIndex != toDeleteIndex) {
            TileWithCoordLib.TileWithCoord memory lastValue = self.values[lastIndex];
            self.values[toDeleteIndex] = lastValue;
            self.indexes[lastValue.getKey()] = idx;
        }
        self.values.pop();
        delete self.indexes[key];
    }

    function _getIdx(
        Map storage self,
        uint256 x,
        uint256 y
    ) private view returns (uint256) {
        uint256 key = TileWithCoordLib.getKey(x, y);
        return self.indexes[key];
    }

    function _grow(uint256 x) private pure returns (uint256) {
        return (x | ((x & RIGHT_MASK_NEG) << 1) | ((x & LEFT_MASK_NEG) >> 1) | (x << 24) | (x >> 24));
    }

    function _growMiddle(TileLib.Tile memory self) internal pure returns (TileLib.Tile memory e) {
        e.data[0] = _grow(self.data[0]) | ((self.data[1] & UP_MASK) << (24 * 7));
        e.data[1] =
            _grow(self.data[1]) |
            ((self.data[2] & UP_MASK) << (24 * 7)) |
            ((self.data[0] & DOWN_MASK) >> (24 * 7));
        e.data[2] = _grow(self.data[2]) | ((self.data[1] & DOWN_MASK) >> (24 * 7));
        return e;
    }

    function _growRight(TileLib.Tile memory self) internal pure returns (TileLib.Tile memory e) {
        // for loop removed to save some gas.
        e.data[0] = (self.data[0] & RIGHT_MASK) >> 23;
        e.data[1] = (self.data[1] & RIGHT_MASK) >> 23;
        e.data[2] = (self.data[2] & RIGHT_MASK) >> 23;
        return e;
    }

    function _growLeft(TileLib.Tile memory self) internal pure returns (TileLib.Tile memory e) {
        e.data[0] = (self.data[0] & LEFT_MASK) << 23;
        e.data[1] = (self.data[1] & LEFT_MASK) << 23;
        e.data[2] = (self.data[2] & LEFT_MASK) << 23;
        return e;
    }
}
