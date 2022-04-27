//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {TileLib} from "./TileLib.sol";

// An abstraction over TileLib that add coordinates (x,y) and avoid overwriting self data by cloning in getters
// A square of 24x24 bits with coordinates
library TileWithCoordLib {
    using TileLib for TileLib.Tile;

    struct TileWithCoord {
        TileLib.Tile tile;
    }

    uint256 constant COORD_MASK_POS = 0xFFFFFFFFFFFFFFFF000000000000000000000000000000000000000000000000;
    uint256 constant COORD_MASK_NEG = 0x0000000000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;

    // TileWithCoord x and y always start in multiples of 24
    function initTileWithCoord(uint256 x, uint256 y) internal pure returns (TileWithCoord memory) {
        require(x % 24 == 0 && y % 24 == 0, "Invalid initial coordinates");
        TileWithCoord memory ret;
        ret.tile.data[1] = (x / 24) << 192;
        ret.tile.data[2] = (y / 24) << 192;
        return ret;
    }

    // setQuad overwriting self
    function setQuad(TileWithCoord memory self, uint256 xi, uint256 yi, uint256 size, function (uint256) view returns (uint256) quadMask) internal view returns (TileWithCoord memory) {
        require(getX(self) == xi / 24 && getY(self) == yi / 24, "Invalid tile coordinates");
        self.tile = self.tile.setQuad(xi % 24, yi % 24, size, quadMask);
        return self;
    }

    // clearQuad overwriting self
    function clearQuad(TileWithCoord memory self, uint256 xi, uint256 yi, uint256 size, function (uint256) view returns (uint256) quadMask) internal view returns (TileWithCoord memory) {
        require(getX(self) == xi / 24 && getY(self) == yi / 24, "Invalid tile coordinates");
        self.tile = self.tile.clearQuad(xi % 24, yi % 24, size, quadMask);
        return self;
    }

    // merge overwriting self
    function merge(TileWithCoord memory self, TileWithCoord memory value) internal pure returns (TileWithCoord memory) {
        require(getX(self) == getX(value) && getY(self) == getY(value), "Invalid tile coordinates");
        self.tile = self.tile.or(value.tile);
        return self;
    }

    // remove values from self overwriting self in the process
    function subtract(TileWithCoord memory self, TileWithCoord memory value) internal pure returns (TileWithCoord memory) {
        require(getX(self) == getX(value) && getY(self) == getY(value), "Invalid tile coordinates");
        self.tile = self.tile.subtractWitMask(value.tile, COORD_MASK_NEG);
        return self;
    }

    function containQuad(TileWithCoord memory self, uint256 xi, uint256 yi, uint256 size, function (uint256) view returns (uint256) quadMask) internal view returns (bool) {
        require(getX(self) == xi / 24 && getY(self) == yi / 24, "Invalid tile coordinates");
        return self.tile.containQuad(xi % 24, yi % 24, size, quadMask);
    }

    function containTile(TileWithCoord memory self, TileWithCoord memory contained) internal pure returns (bool) {
        return contained.tile.isEqual(contained.tile.clone().and(self.tile));
    }

    function getX(TileWithCoord memory self) internal pure returns (uint256) {
        return self.tile.data[1] >> 192;
    }

    function getY(TileWithCoord memory self) internal pure returns (uint256) {
        return self.tile.data[2] >> 192;
    }

    function getKey(uint256 x, uint256 y) internal pure returns (uint256) {
        return (x / 24) | (y / 24) << 32;
    }

    function getKey(TileWithCoord memory self) internal pure returns (uint256) {
        return getX(self) | getY(self) << 32;
    }

    function isEmpty(TileWithCoord memory self) internal pure returns (bool) {
        return self.tile.data[0] & COORD_MASK_NEG == 0
        && self.tile.data[1] & COORD_MASK_NEG == 0
        && self.tile.data[2] & COORD_MASK_NEG == 0;
    }

}
