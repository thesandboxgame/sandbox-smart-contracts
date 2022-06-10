//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {TileLib} from "./TileLib.sol";

// A square of 24x24 bits with coordinates
library TileWithCoordLib {
    using TileLib for TileLib.Tile;

    // 0x0000000000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
    uint256 public constant COORD_MASK_NEG = (2**(24 * 8) - 1);

    struct TileWithCoord {
        TileLib.Tile tile;
    }

    // TileWithCoord x and y always start in multiples of 24
    function initTileWithCoord(uint256 x, uint256 y) internal pure returns (TileWithCoord memory) {
        TileWithCoord memory ret;
        ret.tile.data[0] = (getKey(x, y)) << 224;
        ret.tile.data[1] = (x / 24) << 224;
        ret.tile.data[2] = (y / 24) << 224;
        return ret;
    }

    function setQuad(
        TileWithCoord memory self,
        uint256 xi,
        uint256 yi,
        uint256 size
    ) internal pure returns (TileWithCoord memory) {
        require(getX(self) == xi / 24 && getY(self) == yi / 24, "Invalid tile coordinates");
        self.tile = self.tile.setQuad(xi % 24, yi % 24, size);
        return self;
    }

    function clearQuad(
        TileWithCoord memory self,
        uint256 xi,
        uint256 yi,
        uint256 size
    ) internal pure returns (TileWithCoord memory) {
        require(getX(self) == xi / 24 && getY(self) == yi / 24, "Invalid tile coordinates");
        self.tile = self.tile.clearQuad(xi % 24, yi % 24, size);
        return self;
    }

    function merge(TileWithCoord memory self, TileWithCoord memory value) internal pure returns (TileWithCoord memory) {
        require(getX(self) == getX(value) && getY(self) == getY(value), "Invalid tile coordinates");
        self.tile = self.tile.or(value.tile);
        return self;
    }

    function subtract(TileWithCoord memory self, TileWithCoord memory value)
        internal
        pure
        returns (TileWithCoord memory)
    {
        require(getX(self) == getX(value) && getY(self) == getY(value), "Invalid tile coordinates");
        self.tile.data[0] &= ~(value.tile.data[0] & COORD_MASK_NEG);
        self.tile.data[1] &= ~(value.tile.data[1] & COORD_MASK_NEG);
        self.tile.data[2] &= ~(value.tile.data[2] & COORD_MASK_NEG);
        return self;
    }

    function containCoord(
        TileWithCoord memory self,
        uint256 xi,
        uint256 yi
    ) internal pure returns (bool) {
        require(getX(self) == xi / 24 && getY(self) == yi / 24, "Invalid tile coordinates");
        return self.tile.containCoord(xi % 24, yi % 24);
    }

    function containQuad(
        TileWithCoord memory self,
        uint256 xi,
        uint256 yi,
        uint256 size
    ) internal pure returns (bool) {
        require(getX(self) == xi / 24 && getY(self) == yi / 24, "Invalid tile coordinates");
        return self.tile.containQuad(xi % 24, yi % 24, size);
    }

    function containTile(TileWithCoord memory self, TileWithCoord memory contained) internal pure returns (bool) {
        return contained.tile.isEqual(contained.tile.clone().and(self.tile));
    }

    function getKey(TileWithCoord memory self) internal pure returns (uint256) {
        return self.tile.data[0] >> 224;
    }

    function getX(TileWithCoord memory self) internal pure returns (uint256) {
        return self.tile.data[1] >> 224;
    }

    function getY(TileWithCoord memory self) internal pure returns (uint256) {
        return self.tile.data[2] >> 224;
    }

    function getKey(uint256 x, uint256 y) internal pure returns (uint256) {
        return (x / 24) | ((y / 24) << 16);
    }

    function isEmpty(TileWithCoord memory self) internal pure returns (bool) {
        return (self.tile.data[0] | self.tile.data[1] | self.tile.data[2]) & COORD_MASK_NEG == 0;
    }

    function isEqual(TileWithCoord memory self, TileWithCoord memory other) internal pure returns (bool) {
        return
            self.tile.data[0] == other.tile.data[0] &&
            self.tile.data[1] == other.tile.data[1] &&
            self.tile.data[2] == other.tile.data[2];
    }

    function isEqualIgnoreCoords(TileWithCoord memory self, TileLib.Tile memory b) internal pure returns (bool) {
        return
            ((self.tile.data[0] ^ b.data[0]) | (self.tile.data[1] ^ b.data[1]) | (self.tile.data[2] ^ b.data[2])) &
                COORD_MASK_NEG ==
            0;
    }

    function findAPixel(TileWithCoord memory self) internal pure returns (TileLib.Tile memory ret) {
        uint256 target;
        uint256 shift;

        target = self.tile.data[2] & COORD_MASK_NEG;
        if (target != 0) {
            shift = _findAPixel(target);
            ret.data[2] = (1 << shift);
            return ret;
        }

        target = self.tile.data[1] & COORD_MASK_NEG;
        if (target != 0) {
            shift = _findAPixel(target);
            ret.data[1] = (1 << shift);
            return ret;
        }

        target = self.tile.data[0] & COORD_MASK_NEG;
        if (target != 0) {
            shift = _findAPixel(target);
            ret.data[0] = (1 << shift);
        }
        return ret;
    }

    function _findAPixel(uint256 target) private pure returns (uint256 shift) {
        uint256 mask = (2**64 - 1);
        // divide in 3 parts, then do a binary search
        if ((target & mask) == 0) {
            target = target >> 64;
            shift = 64;
            if ((target & mask) == 0) {
                target = target >> 64;
                shift = 128;
            }
        }
        for (uint256 i = 32; i > 0; i = i / 2) {
            mask = mask >> i;
            if ((target & mask) == 0) {
                target = target >> i;
                shift += i;
            }
        }
        return shift;
    }
}
