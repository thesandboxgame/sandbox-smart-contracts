//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {TileWithCoordLib} from "./TileWithCoordLib.sol";

library MapLib {
    using TileWithCoordLib for TileWithCoordLib.TileWithCoord;

    // To remove empty tiles we need to store the key (aka coords) inside the value
    // For now we will leave empty tiles in the structure
    struct Map {
        TileWithCoordLib.TileWithCoord[] values;
        // Position of the value in the `values` array, plus 1 because index 0
        // means a value is not in the set.
        mapping(uint256 => uint256) indexes;
    }

    function containCoord(Map storage self, uint256 x, uint256 y) internal view returns (bool) {
        uint256 key = TileWithCoordLib.getKey(x, y);
        uint256 idx = self.indexes[key];
        if (idx == 0) {// !contains
            return false;
        }
        return self.values[idx - 1].containCoord(x, y);
    }

    function containQuad(Map storage self, uint256 x, uint256 y, uint256 size, function (uint256) view returns (uint256) quadMask) internal view returns (bool) {
        uint256 key = TileWithCoordLib.getKey(x, y);
        uint256 idx = self.indexes[key];
        if (idx == 0) {// !contains
            return false;
        }
        // TODO: We can call TileLib directly to use less gas ?
        return self.values[idx - 1].containQuad(x, y, size, quadMask);
    }

    function containTileWithCoord(Map storage self, TileWithCoordLib.TileWithCoord memory tile) internal view returns (bool) {
        uint256 key = tile.getKey();
        uint256 idx = self.indexes[key];
        if (idx == 0) {// !contains
            return false;
        }
        return self.values[idx - 1].containTile(tile);
    }

    // TODO: Check gas consumption!!!
    // OBS: self can be huge, but contained must be small, we iterate over contained values.
    function containMap(Map storage self, Map storage contained) internal view returns (bool) {
        uint256 i;
        for (; i < contained.values.length; i++) {
            if (!containTileWithCoord(self, contained.values[i])) {
                return false;
            }
        }
        return false;
    }

    function setQuad(Map storage self, uint256 x, uint256 y, uint256 size, function (uint256) view returns (uint256) quadMask) internal {
        uint256 key = TileWithCoordLib.getKey(x, y);
        uint256 idx = self.indexes[key];
        if (idx == 0) {// !contains
            // Add a new tile
            TileWithCoordLib.TileWithCoord memory t = TileWithCoordLib.initTileWithCoord(x, y);
            self.values.push(t.setQuad(x, y, size, quadMask));
            self.indexes[key] = self.values.length;
        } else {// contains
            self.values[idx - 1] = self.values[idx - 1].setQuad(x, y, size, quadMask);
        }
    }

    function setTileWithCoord(Map storage self, TileWithCoordLib.TileWithCoord memory tile) internal {
        uint256 key = tile.getKey();
        uint256 idx = self.indexes[key];
        if (idx == 0) {// !contains
            // Add a new tile
            self.values.push(tile);
            self.indexes[key] = self.values.length;
        } else {
            self.values[idx - 1] = self.values[idx - 1].merge(tile);
        }
    }

    function setMap(Map storage self, Map storage contained) internal {
        uint256 i;
        for (; i < contained.values.length; i++) {
            setTileWithCoord(self, contained.values[i]);
        }
    }

    function clearQuad(Map storage self, uint256 x, uint256 y, uint256 size, function (uint256) view returns (uint256) quadMask) internal returns (bool) {
        uint256 key = TileWithCoordLib.getKey(x, y);
        uint256 idx = self.indexes[key];
        if (idx == 0) {// !contains, nothing to clear
            return false;
        }
        TileWithCoordLib.TileWithCoord memory t = self.values[idx - 1].clearQuad(x, y, size, quadMask);
        if (t.isEmpty()) {
            remove(self, idx, key);
        } else {
            self.values[idx - 1] = t;
        }
        return true;
    }

    function clearTileWithCoord(Map storage self, TileWithCoordLib.TileWithCoord memory tile) internal returns (bool) {
        uint256 key = tile.getKey();
        uint256 idx = self.indexes[key];
        if (idx == 0) {// !contains
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

    function clearMap(Map storage self, Map storage contained) internal {
        uint256 i;
        for (; i < contained.values.length; i++) {
            clearTileWithCoord(self, contained.values[i]);
        }
    }

    function length(Map storage self) internal view returns (uint256) {
        return self.values.length;
    }

    function at(Map storage self, uint256 index) internal view returns (TileWithCoordLib.TileWithCoord memory) {
        return self.values[index];
    }

    // Just for testing
    function containTileAtCoord(Map storage self, uint256 x, uint256 y) internal view returns (bool) {
        uint256 key = TileWithCoordLib.getKey(x, y);
        uint256 idx = self.indexes[key];
        return (idx != 0);
    }

    function remove(Map storage self, uint256 idx, uint256 key) private {
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
