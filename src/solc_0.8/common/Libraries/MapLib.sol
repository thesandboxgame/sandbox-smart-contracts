//SPDX-License-Identifier: MIT
/* solhint-disable code-complexity */
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {TileWithCoordLib} from "./TileWithCoordLib.sol";
import {TileLib} from "./TileLib.sol";

/// @title An iterable mapping of Tiles (24x24 bit set).
/// @notice Used to represent a the presence or absence of certain x,y coordinate in a map of lands
/// @dev The key of the mapping is a combination of x and y.
/// @dev This library try to reduce the gas consumption and to do that it accesses the internal structure of the Tiles
library MapLib {
    using TileWithCoordLib for TileWithCoordLib.TileWithCoord;
    using TileLib for TileLib.Tile;

    uint256 private constant LEFT_MASK = 0x000001000001000001000001000001000001000001000001;
    uint256 private constant LEFT_MASK_NEG = ~LEFT_MASK;
    uint256 private constant RIGHT_MASK = 0x800000800000800000800000800000800000800000800000;
    uint256 private constant RIGHT_MASK_NEG = ~RIGHT_MASK;
    uint256 private constant UP_MASK = 0x000000000000000000000000000000000000000000FFFFFF;
    uint256 private constant DOWN_MASK = 0xFFFFFF000000000000000000000000000000000000000000;

    struct TranslateResult {
        TileWithCoordLib.TileWithCoord topLeft;
        TileWithCoordLib.TileWithCoord topRight;
        TileWithCoordLib.TileWithCoord bottomLeft;
        TileWithCoordLib.TileWithCoord bottomRight;
    }

    // An iterable mapping of tiles (24x24 bit set).
    struct Map {
        TileWithCoordLib.TileWithCoord[] values;
        // Position of the value in the `values` array, plus 1 because index 0 means that the key is not found.
        mapping(uint256 => uint256) indexes;
    }

    /// @notice Set the bits inside a square that has size x size in the x,y coordinates in the map
    /// @dev the coordinates must be % size and size can be 1, 3, 6, 12 and 24 to match the Quads in the land contract
    /// @param self the Map in which the bits are set
    /// @param x the x coordinate of the square
    /// @param y the y coordinate of the square
    /// @param size the size of the square
    function set(
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
            TileWithCoordLib.TileWithCoord memory t = TileWithCoordLib.init(x, y);
            self.values.push(t.set(x, y, size));
            self.indexes[key] = self.values.length;
        } else {
            // contains
            self.values[idx - 1] = self.values[idx - 1].set(x, y, size);
        }
    }

    /// @notice Given a translation of a tile the corresponding bits are set in the current map
    /// @param self the Map in which the bits are set
    /// @param s translation result, the result of a translation of a tile are four tiles.
    function set(Map storage self, TranslateResult memory s) public {
        set(self, s.topLeft);
        set(self, s.topRight);
        set(self, s.bottomLeft);
        set(self, s.bottomRight);
    }

    /// @notice Given a TileWithCoord (a tile that includes coordinates inside it) set the corresponding bits in the map
    /// @param self the Map in which the bits are set
    /// @param tile the tile that is used to set the bits inside the map
    function set(Map storage self, TileWithCoordLib.TileWithCoord memory tile) public {
        if (tile.isEmpty()) {
            return;
        }
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

    /// @notice Merge the bits of another map in the current one
    /// @param self the Map in which the bits are set
    /// @param contained the map that is used as source to set the bits in the current one
    function set(Map storage self, Map storage contained) public {
        for (uint256 i; i < contained.values.length; i++) {
            set(self, contained.values[i]);
        }
    }

    /// @notice Clear the bits inside a square that has size x size in the x,y coordinates in the map
    /// @dev the coordinates must be % size and size can be 1, 3, 6, 12 and 24 to match the Quads in the land contract
    /// @param self the Map, in which the bits will be cleared
    /// @param x the x coordinate of the square
    /// @param y the y coordinate of the square
    /// @param size the size of the square
    /// @return false if the the coordinates are not found so the bits are already cleared
    function clear(
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
        TileWithCoordLib.TileWithCoord memory t = self.values[idx - 1].clear(x, y, size);
        if (t.isEmpty()) {
            _remove(self, idx, key);
        } else {
            self.values[idx - 1] = t;
        }
        return true;
    }

    /// @notice Given a TileWithCoord (a tile that includes coordinates inside it) clear the corresponding bits in the map
    /// @param self the Map, in which the bits will be cleared
    /// @param tile the tile that is used to clear the bits inside the map
    /// @return false if the the coordinates are not found so the bits are already cleared
    function clear(Map storage self, TileWithCoordLib.TileWithCoord memory tile) public returns (bool) {
        uint256 key = tile.getKey();
        uint256 idx = self.indexes[key];
        if (idx == 0) {
            // !contains
            return false;
        }
        TileWithCoordLib.TileWithCoord memory t = self.values[idx - 1].clear(tile);
        if (t.isEmpty()) {
            _remove(self, idx, key);
        } else {
            self.values[idx - 1] = t;
        }
        return true;
    }

    /// @notice Clear the bits of another map in the current one
    /// @param self the Map in which the bits are cleared
    /// @param contained the map that is used as source to clear the bits in the current one
    function clear(Map storage self, Map storage contained) public {
        for (uint256 i; i < contained.values.length; i++) {
            clear(self, contained.values[i]);
        }
    }

    /// @notice Clear the all the bits in the map
    /// @param self the Map in which the bits are cleared
    function clear(Map storage self) public {
        for (uint256 i; i < self.values.length; i++) {
            delete self.indexes[self.values[i].getKey()];
        }
        delete self.values;
    }

    /// @notice given a tile, translate all the bits in the x and y direction
    /// @dev the result of the translation are four tiles
    /// @param deltaX the x distance to translate
    /// @param deltaY the y distance to translate
    /// @return four tiles with coords that are the result of the translation
    function translate(
        TileLib.Tile memory tile,
        uint256 deltaX,
        uint256 deltaY
    ) internal pure returns (TranslateResult memory) {
        (uint256[6] memory col1, uint256[6] memory col2) = tile.translate(deltaX % 24, deltaY % 24);
        return
            TranslateResult({
                topLeft: TileWithCoordLib.init(deltaX, deltaY, col1[0], col1[1], col1[2]),
                bottomLeft: TileWithCoordLib.init(deltaX, deltaY + 24, col1[3], col1[4], col1[5]),
                topRight: TileWithCoordLib.init(deltaX + 24, deltaY, col2[0], col2[1], col2[2]),
                bottomRight: TileWithCoordLib.init(deltaX + 24, deltaY + 24, col2[3], col2[4], col2[5])
            });
    }

    /// @notice Check if the bit in certain coordinate are set or not inside the map
    /// @param self the Map where the check is done
    /// @param x the x coordinate
    /// @param y the  coordinate
    /// @return true if the x,y coordinate bit is set or false if it is cleared
    function contain(
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
        return self.values[idx - 1].contain(x, y);
    }

    /// @notice Check if the all the bits of a square inside the Map are set or not
    /// @dev the coordinates must be % size and size can be 1, 3, 6, 12 and 24 to match the Quads in the land contract
    /// @param self the TileWithCoord where the check is done
    /// @param x the x coordinate of the square
    /// @param y the y coordinate of the square
    /// @param size the size of the square
    /// @return true if al the bits are set or false if at least one bit is cleared
    function contain(
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
        return self.values[idx - 1].contain(x, y, size);
    }

    /// @notice Check if a Map includes all the bits that are set in a TileWithCoord
    /// @param self the Map that is checked for inclusion
    /// @param tile the TileWithCoord that must be included
    /// @return true if self contain contained TileWithCoord
    function contain(Map storage self, TileWithCoordLib.TileWithCoord memory tile) public view returns (bool) {
        if (tile.isEmpty()) {
            return true;
        }
        uint256 key = tile.getKey();
        uint256 idx = self.indexes[key];
        if (idx == 0) {
            // !contains
            return false;
        }
        return self.values[idx - 1].tile.contain(tile.tile);
    }

    /// @notice Check if a Map includes all the bits that are set in translation result
    /// @dev this routine is used to match an experience template after translation
    /// @param self the bigger Tile that is checked for inclusion
    /// @param s the translation result that must be included
    /// @return true if self contain all the bits in the translation result
    function contain(Map storage self, TranslateResult memory s) public view returns (bool) {
        return
            contain(self, s.topLeft) &&
            contain(self, s.topRight) &&
            contain(self, s.bottomLeft) &&
            contain(self, s.bottomRight);
    }

    /// @notice Check if a Map includes all the bits that are set in another Map
    /// @dev self can be huge, but contained must be small, we iterate over contained values.
    /// @param self the Map that is checked for inclusion
    /// @param contained the Map that must be included
    /// @return true if self contain contained Map
    function contain(Map storage self, Map storage contained) public view returns (bool) {
        for (uint256 i; i < contained.values.length; i++) {
            if (!contain(self, contained.values[i])) {
                return false;
            }
        }
        return true;
    }

    /// @notice Check if a map has at least one bit in common with some TileWithCoord
    /// @param self the Map to compare
    /// @param tile the TileWithCoord to compare
    /// @return true if there is at least one bit set in both the Map and the TileWithCoord
    function intersect(Map storage self, TileWithCoordLib.TileWithCoord memory tile) public view returns (bool) {
        if (tile.isEmpty()) {
            return false;
        }
        uint256 key = tile.getKey();
        uint256 idx = self.indexes[key];
        if (idx == 0) {
            // !contains
            return false;
        }
        return self.values[idx - 1].tile.intersect(tile.tile);
    }

    /// @notice Check if a map has at least one bit in common with some translation result
    /// @param self the Map to compare
    /// @param s the four tiles that are the result of a translation
    /// @return true if there is at least one bit set in both the Map and the TranslationResult
    function intersect(Map storage self, TranslateResult memory s) public view returns (bool) {
        return
            intersect(self, s.topLeft) &&
            intersect(self, s.topRight) &&
            intersect(self, s.bottomLeft) &&
            intersect(self, s.bottomRight);
    }

    /// @notice Check if a map is empty (no bits are set)
    /// @param self the Map to check
    /// @return true if the map is empty
    function isEmpty(Map storage self) public view returns (bool) {
        // We remove the tiles when they are empty
        return self.values.length == 0;
    }

    /// @notice Check if two maps are equal
    /// @param self the first Map to check
    /// @param other the second Map to check
    /// @return true if the two maps are equal
    function isEqual(Map storage self, Map storage other) public view returns (bool) {
        return isEqual(self, other.values);
    }

    /// @notice Check if a map is equal to an array of TileWithCoord
    /// @param self the Map to check
    /// @param other the list of TileWithCoord to check
    /// @return true if the two are equal
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

    /// @notice return the length of the internal list of tiles
    /// @dev used to iterate off-chain over the tiles.
    /// @param self the Map
    /// @return the length of the list
    function length(Map storage self) public view returns (uint256) {
        return self.values.length;
    }

    /// @notice get the tile that is in certain position in the internal list of tiles
    /// @dev used to iterate off-chain over the tiles.
    /// @param self the Map
    /// @param index the index of the tile
    /// @return the tile that is in the position index in the list
    function at(Map storage self, uint256 index) public view returns (TileWithCoordLib.TileWithCoord memory) {
        return self.values[index];
    }

    /// @notice get the internal list of tiles with pagination
    /// @dev used to iterate off-chain over the tiles.
    /// @param self the Map
    /// @param offset initial offset used to paginate
    /// @param limit amount of tiles to get
    /// @return the partial list of tiles
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

    /// @notice return the internal list of tiles
    /// @dev Use only for testing. This can be problematic if it grows too much !!!
    /// @param self the map
    /// @return the list of internal tiles
    function getMap(Map storage self) public view returns (TileWithCoordLib.TileWithCoord[] memory) {
        return self.values;
    }

    /// @notice count the amount of bits (lands) set inside a Map
    /// @param self the map
    /// @return the quantity of lands
    function getLandCount(Map storage self) public view returns (uint256) {
        uint256 ret;
        uint256 len = self.values.length;
        for (uint256 i; i < len; i++) {
            ret += self.values[i].countBits();
        }
        return ret;
    }

    /// @notice check if a square is adjacent (4-connected component) to the current map.
    /// @dev used to add a quad to a map, it is cheaper than isAdjacent(map)
    /// @param self the map
    /// @param x the x coordinate of the square
    /// @param y the y coordinate of the square
    /// @param size the size of the square
    /// @return true if the square is 4-connected to the map
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
        TileLib.Tile memory spot;
        spot = spot.set(x % 24, y % 24, size);
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

    /// @notice check that the map has only one 4-connected component, aka everything is adjacent
    /// @dev Checks the full map to see if all the pixels are adjacent
    /// @param self the map
    /// @return ret true if all the bits (lands) are adjacent
    function isAdjacent(Map storage self) public view returns (bool ret) {
        if (isEmpty(self)) {
            // everything is adjacent to an empty map
            return true;
        }

        TileLib.Tile[] memory spot = new TileLib.Tile[](self.values.length);
        // We assume that all self.values[] are non empty (we remove them if they are empty).
        spot[0] = self.values[0].tile.findAPixel();
        bool done;
        while (!done) {
            (spot, done) = floodStep(self, spot);
        }
        uint256 len = self.values.length;
        uint256 i;
        for (; i < len; i++) {
            // Check the tile ignoring coordinates
            if (!self.values[i].tile.isEqual(spot[i])) {
                return false;
            }
        }
        return true;
    }

    /// @notice used to check adjacency. See: https://en.wikipedia.org/wiki/Flood_fill and isAdjacent.
    /// @param self the map
    /// @param current the current image
    /// @return next return the image with the extra pixels that correspond to the flooding process
    /// @return done true if the current image is the same as the next one so the algorithm is ready to stop flooding.
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

            // middle, always included
            next[i].data[0] |= _grow(ci.data[0]) | ((ci.data[1] & UP_MASK) << (24 * 7));
            next[i].data[1] |=
                _grow(ci.data[1]) |
                ((ci.data[2] & UP_MASK) << (24 * 7)) |
                ((ci.data[0] & DOWN_MASK) >> (24 * 7));
            next[i].data[2] |= _grow(ci.data[2]) | ((ci.data[1] & DOWN_MASK) >> (24 * 7));
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

    /// @notice delete certain tile from the map
    /// @param self the Map where the tile is removed
    /// @param idx the index of the tile in the internal list
    /// @param key the key of the tile (combination of x,y)
    function _remove(
        Map storage self,
        uint256 idx,
        uint256 key
    ) private {
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

    /// @notice given x and y return the index of the tile inside the internal list of tiles
    /// @param self the Map where the tile is removed
    /// @param x the x coordinate
    /// @param y the y coordinate
    /// @return the index in the list + 1 or zero if not found
    function _getIdx(
        Map storage self,
        uint256 x,
        uint256 y
    ) private view returns (uint256) {
        return self.indexes[TileWithCoordLib.getKey(x, y)];
    }

    /// @notice grow (4-connected) the internal word that represent 8 lines of the tile adding pixels
    /// @param x the value of the internal work
    /// @return the internal work with the extra pixels from growing it
    function _grow(uint256 x) private pure returns (uint256) {
        return (x | ((x & RIGHT_MASK_NEG) << 1) | ((x & LEFT_MASK_NEG) >> 1) | (x << 24) | (x >> 24));
    }

    /// @notice grow (4-connected) a tile adding pixels around those that exists
    /// @param self the tile to grow
    /// @return e the tile that results from adding all the 4-connected pixels
    function _growMiddle(TileLib.Tile memory self) internal pure returns (TileLib.Tile memory e) {
        e.data[0] = _grow(self.data[0]) | ((self.data[1] & UP_MASK) << (24 * 7));
        e.data[1] =
            _grow(self.data[1]) |
            ((self.data[2] & UP_MASK) << (24 * 7)) |
            ((self.data[0] & DOWN_MASK) >> (24 * 7));
        e.data[2] = _grow(self.data[2]) | ((self.data[1] & DOWN_MASK) >> (24 * 7));
        return e;
    }

    /// @notice grow (4-connected) a tile adding pixels around those that exists
    /// @param self the tile to grow
    /// @return e the extra tile to the right that results from adding all the 4-connected pixels
    function _growRight(TileLib.Tile memory self) internal pure returns (TileLib.Tile memory e) {
        // for loop removed to save some gas.
        e.data[0] = (self.data[0] & RIGHT_MASK) >> 23;
        e.data[1] = (self.data[1] & RIGHT_MASK) >> 23;
        e.data[2] = (self.data[2] & RIGHT_MASK) >> 23;
        return e;
    }

    /// @notice grow (4-connected) a tile adding pixels around those that exists
    /// @param self the tile to grow
    /// @return e the extra tile to the left that results from adding all the 4-connected pixels
    function _growLeft(TileLib.Tile memory self) internal pure returns (TileLib.Tile memory e) {
        e.data[0] = (self.data[0] & LEFT_MASK) << 23;
        e.data[1] = (self.data[1] & LEFT_MASK) << 23;
        e.data[2] = (self.data[2] & LEFT_MASK) << 23;
        return e;
    }
}
