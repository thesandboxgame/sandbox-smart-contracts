//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {TileLib} from "./TileLib.sol";

// A square of 24x24 bits with coordinates
library TileWithCoordLib {
    using TileLib for TileLib.Tile;

    struct TileWithCoord {
        TileLib.Tile tile;
    }

    uint256 constant COORD_MASK_POS = 0xFFFFFFFFFFFFFFFF000000000000000000000000000000000000000000000000;
    uint256 constant COORD_MASK_NEG = 0x0000000000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;

    function initTile(uint256 x, uint256 y) internal pure returns (TileWithCoord memory) {
        TileWithCoord memory ret;
        ret.tile.data[1] = x << 192;
        ret.tile.data[2] = y << 192;
        return ret;
    }

    function clone(TileWithCoord memory self) internal pure returns (TileWithCoord memory) {
        return TileWithCoord(self.tile.clone());
    }

    function getX(TileWithCoord memory self) internal pure returns (uint256) {
        return (self.tile.data[1] >> 192) / 24;
    }

    function getY(TileWithCoord memory self) internal pure returns (uint256) {
        return (self.tile.data[2] >> 192) / 24;
    }

    function getKey(TileWithCoord memory self) internal pure returns (uint256) {
        return getKey(getX(self), getY(self));
    }

    function getKey(uint256 x, uint256 y) internal pure returns (uint256) {
        return x / 24 | y / 24 << 32;
    }

    function setQuad(TileWithCoord memory self, uint256 xi, uint256 yi, uint256 size, function (uint256) view returns (uint256) quadMask) internal view returns (TileWithCoord memory) {
        require(getX(self) == xi / 24 && getY(self) == yi / 24, "Invalid tile coordinates");
        return TileWithCoord(self.tile.setQuad(xi % 24, yi % 24, size, quadMask));
    }

    function clearQuad(TileWithCoord memory self, uint256 xi, uint256 yi, uint256 size, function (uint256) view returns (uint256) quadMask) internal view returns (TileWithCoord memory) {
        require(getX(self) == xi / 24 && getY(self) == yi / 24, "Invalid tile coordinates");
        return TileWithCoord(self.tile.clearQuad(xi % 24, yi % 24, size, quadMask));
    }

    function containQuad(TileWithCoord memory self, uint256 xi, uint256 yi, uint256 size, function (uint256) view returns (uint256) quadMask) internal view returns (bool) {
        require(getX(self) == xi / 24 && getY(self) == yi / 24, "Invalid tile coordinates");
        return self.tile.containQuad(xi % 24, yi % 24, size, quadMask);
    }

    function containTile(TileWithCoord memory self, TileWithCoord memory contained) internal pure returns (bool) {
        return contained.tile.isEqual(self.tile.intersection(contained.tile));
    }

    function isEmpty(TileWithCoord memory self) internal pure returns (bool) {
        return self.tile.data[0] & COORD_MASK_NEG == 0
        && self.tile.data[1] & COORD_MASK_NEG == 0
        && self.tile.data[2] & COORD_MASK_NEG == 0;
    }

    function or(TileWithCoord memory self, TileWithCoord memory values) internal pure returns (TileWithCoord memory) {
        require(getX(self) == getX(values) && getY(self) == getY(values), "Invalid tile coordinates");
        return TileWithCoord(self.tile.or(values.tile));
    }

    function clearTile(TileWithCoord memory self, TileWithCoord memory value) internal pure returns (TileWithCoord memory) {
        require(getX(self) == getX(value) && getY(self) == getY(value), "Invalid tile coordinates");
        TileLib.Tile memory mask = TileLib.Tile([
            ~(value.tile.data[0] & COORD_MASK_NEG),
            ~(value.tile.data[1] & COORD_MASK_NEG),
            ~(value.tile.data[2] & COORD_MASK_NEG)]);
        return TileWithCoord(self.tile.and(mask));
    }
}
