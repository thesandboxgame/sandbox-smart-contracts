//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {TileWithCoordLib} from "./TileWithCoordLib.sol";

library MapLib {
    using TileWithCoordLib for TileWithCoordLib.TileWithCoord;

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
            remove(self, idx, key);
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
            remove(self, idx, key);
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
        TileWithCoordLib.TileWithCoord[] memory ret;
        for (uint256 i; i < limit; i++) {
            ret[i] = self.values[offset + i];
        }
        return ret;
    }

    // This can be problematic if it grows too much !!!
    function getMap(Map storage self) public view returns (TileWithCoordLib.TileWithCoord[] memory) {
        return self.values;
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

    function remove(
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
}
