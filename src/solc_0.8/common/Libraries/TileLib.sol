//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

// TODO: Check if a pure function is better than a mapping for the masks
// A square of 24x24 bits
library TileLib {
    struct ExtendedTile {
        Tile left;
        uint256 up;
        Tile middle;
        uint256 down;
        Tile right;
    }

    struct Tile {
        uint256[3] data;
    }

    uint256 private constant DATA_LEN = 3;

    // 0x0000000000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
    uint256 public constant COORD_MASK_NEG = (2**(24 * 8) - 1);

    function initTile() internal pure returns (Tile memory) {
        Tile memory ret;
        return ret;
    }

    function clone(Tile memory self) internal pure returns (Tile memory) {
        return Tile([self.data[0], self.data[1], self.data[2]]);
    }

    // TODO: Optimize for 24x24 ?.
    // TODO: What about a method without the requires (we must check outside of this one)
    function setQuad(
        Tile memory self,
        uint256 x,
        uint256 y,
        uint256 size
    ) internal pure returns (Tile memory) {
        require(x < 24 && y < 24, "Invalid tile coordinates");
        require(x % size == 0 && y % size == 0, "Invalid coordinates");
        uint256 mask = _quadMask(size);
        require(mask != 0, "invalid size");
        uint256 i;
        for (; i < size; i++) {
            uint256 idx = (y + i) / 8;
            self.data[idx] |= mask << (x + 24 * ((y + i) % 8));
        }
        return self;
    }

    function clearQuad(
        Tile memory self,
        uint256 x,
        uint256 y,
        uint256 size
    ) internal pure returns (Tile memory) {
        require(x < 24 && y < 24, "Invalid tile coordinates");
        require(x % size == 0 && y % size == 0, "Invalid coordinates");
        uint256 mask = _quadMask(size);
        require(mask != 0, "invalid size");
        uint256 i;
        for (; i < size; i++) {
            uint256 idx = (y + i) / 8;
            self.data[idx] &= ~(mask << (x + 24 * ((y + i) % 8)));
        }
        return self;
    }

    function containCoord(
        Tile memory self,
        uint256 x,
        uint256 y
    ) internal pure returns (bool) {
        require(x < 24 && y < 24, "Invalid tile coordinates");
        uint256 idx = y / 8;
        uint256 bitMask = 1 << (x + 24 * (y % 8));
        return (self.data[idx] & bitMask == bitMask);
    }

    function containQuad(
        Tile memory self,
        uint256 x,
        uint256 y,
        uint256 size
    ) internal pure returns (bool) {
        require(x < 24 && y < 24, "Invalid tile coordinates");
        require(x % size == 0 && y % size == 0, "Invalid coordinates");
        uint256 mask = _quadMask(size);
        require(mask != 0, "invalid size");
        uint256 i;
        for (; i < size; i++) {
            uint256 idx = (y + i) / 8;
            uint256 bitMask = mask << (x + 24 * ((y + i) % 8));
            if (self.data[idx] & bitMask != bitMask) {
                return false;
            }
        }
        return true;
    }

    function isEmpty(Tile memory self) internal pure returns (bool) {
        return (self.data[0] | self.data[1] | self.data[2]) & COORD_MASK_NEG == 0;
    }

    function isEqualIgnoreCoords(Tile memory self, Tile memory b) internal pure returns (bool) {
        return
            ((self.data[0] ^ b.data[0]) | (self.data[1] ^ b.data[1]) | (self.data[2] ^ b.data[2])) & COORD_MASK_NEG ==
            0;
    }

    function isEqual(Tile memory self, Tile memory b) internal pure returns (bool) {
        return self.data[0] == b.data[0] && self.data[1] == b.data[1] && self.data[2] == b.data[2];
    }

    function or(Tile memory self, Tile memory b) internal pure returns (Tile memory) {
        self.data[0] |= b.data[0];
        self.data[1] |= b.data[1];
        self.data[2] |= b.data[2];
        return self;
    }

    function and(Tile memory self, Tile memory b) internal pure returns (Tile memory) {
        self.data[0] &= b.data[0];
        self.data[1] &= b.data[1];
        self.data[2] &= b.data[2];
        return self;
    }

    function subtractWitMask(Tile memory self, Tile memory value) internal pure returns (Tile memory) {
        self.data[0] &= ~(value.data[0] & COORD_MASK_NEG);
        self.data[1] &= ~(value.data[1] & COORD_MASK_NEG);
        self.data[2] &= ~(value.data[2] & COORD_MASK_NEG);
        return self;
    }

    uint256 private constant LEFT_MASK = 0x000001000001000001000001000001000001000001000001;
    uint256 private constant LEFT_MASK_NEG = ~LEFT_MASK;
    uint256 private constant RIGHT_MASK = 0x800000800000800000800000800000800000800000800000;
    uint256 private constant RIGHT_MASK_NEG = ~RIGHT_MASK;
    uint256 private constant UP_MASK = 0x000000000000000000000000000000000000000000FFFFFF;
    uint256 private constant DOWN_MASK = 0xFFFFFF000000000000000000000000000000000000000000;

    function grow(Tile memory self) internal pure returns (ExtendedTile memory e) {
        e.middle.data[0] = grow(self.data[0]) | ((self.data[1] & UP_MASK) << (24 * 7));
        e.middle.data[1] =
            grow(self.data[1]) |
            ((self.data[2] & UP_MASK) << (24 * 7)) |
            ((self.data[0] & DOWN_MASK) >> (24 * 7));
        e.middle.data[2] = grow(self.data[2]) | ((self.data[1] & DOWN_MASK) >> (24 * 7));

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

    function grow(uint256 x) private pure returns (uint256) {
        return (x | ((x & RIGHT_MASK_NEG) << 1) | ((x & LEFT_MASK_NEG) >> 1) | (x << 24) | (x >> 24));
    }

    function addDown(Tile memory self, uint256 toAdd) internal pure returns (Tile memory) {
        self.data[0] = self.data[0] | toAdd;
        return self;
    }

    function addUp(Tile memory self, uint256 toAdd) internal pure returns (Tile memory) {
        self.data[2] = self.data[2] | toAdd;
        return self;
    }

    function findAPixel(Tile memory self) internal pure returns (Tile memory ret) {
        uint256 target;
        uint256 shift;

        target = self.data[2] & COORD_MASK_NEG;
        if (target != 0) {
            shift = findAPixel(target);
            ret.data[2] = ret.data[2] | (1 << shift);
            return ret;
        }

        target = self.data[1] & COORD_MASK_NEG;
        if (target != 0) {
            shift = findAPixel(target);
            ret.data[1] = ret.data[1] | (1 << shift);
            return ret;
        }

        target = self.data[0] & COORD_MASK_NEG;
        if (target != 0) {
            shift = findAPixel(target);
            ret.data[0] = ret.data[0] | (1 << shift);
        }
        return ret;
    }

    function findAPixel(uint256 target) private pure returns (uint256 shift) {
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

    uint256 private constant QUAD_MASK_1 = 1;
    uint256 private constant QUAD_MASK_3 = 2**3 - 1;
    uint256 private constant QUAD_MASK_6 = 2**6 - 1;
    uint256 private constant QUAD_MASK_12 = 2**12 - 1;
    uint256 private constant QUAD_MASK_24 = 2**24 - 1;

    function _quadMask(uint256 size) private pure returns (uint256) {
        if (size == 1) return 1;
        if (size == 3) return QUAD_MASK_3;
        if (size == 6) return QUAD_MASK_6;
        if (size == 12) return QUAD_MASK_12;
        if (size == 24) return QUAD_MASK_24;
        return 0;
    }
}
