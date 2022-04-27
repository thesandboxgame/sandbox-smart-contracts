//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

// TODO: Separate this code into a library + something to store the masks
// TODO: Check if a pure function is better than a mapping for the masks
// A square of 24x24 bits
// This lib does everything inline (destroying self information if necessary), you must clone before calling.
library TileLib {

    struct Tile {
        uint256[3] data;
    }

    function initTile() internal pure returns (Tile memory) {
        Tile memory ret;
        return ret;
    }

    function clone(Tile memory self) internal pure returns (Tile memory) {
        return Tile([self.data[0], self.data[1], self.data[2]]);
    }

    // TODO: Optimize for 24x24 ?.
    // TODO: What about a method without the requires (we must check outside of this one)
    function setQuad(Tile memory self, uint256 x, uint256 y, uint256 size, function (uint256) view returns (uint256) quadMask) internal view returns (Tile memory) {
        require(x < 24 && y < 24, "Invalid tile coordinates");
        require(x % size == 0 && y % size == 0, "Invalid coordinates");
        uint256 mask = quadMask(size);
        require(mask != 0, "invalid size");
        uint256 i;
        for (; i < size; i++) {
            uint256 idx = (y + i) / 8;
            self.data[idx] |= mask << (x + 24 * ((y + i) % 8));
        }
        return self;
    }

    function clearQuad(Tile memory self, uint256 x, uint256 y, uint256 size, function (uint256) view returns (uint256) quadMask) internal view returns (Tile memory) {
        require(x < 24 && y < 24, "Invalid tile coordinates");
        require(x % size == 0 && y % size == 0, "Invalid coordinates");
        uint mask = quadMask(size);
        require(mask != 0, "invalid size");
        uint256 i;
        for (; i < size; i++) {
            uint256 idx = (y + i) / 8;
            self.data[idx] &= ~(mask << (x + 24 * ((y + i) % 8)));
        }
        return self;
    }

    function containQuad(Tile memory self, uint256 x, uint256 y, uint256 size, function (uint256) view returns (uint256) quadMask) internal view returns (bool) {
        require(x < 24 && y < 24, "Invalid tile coordinates");
        require(x % size == 0 && y % size == 0, "Invalid coordinates");
        uint mask = quadMask(size);
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
        return self.data[0] == 0 && self.data[1] == 0 && self.data[2] == 0;
    }

    function isEqual(Tile memory self, Tile memory b) internal pure returns (bool) {
        return self.data[0] == b.data[0] && self.data[1] == b.data[1] && self.data[2] == b.data[2];
    }

    function or(Tile memory self, Tile memory b) internal pure returns (Tile memory){
        self.data[0] |= b.data[0];
        self.data[1] |= b.data[1];
        self.data[2] |= b.data[2];
        return self;
    }

    function and(Tile memory self, Tile memory b) internal pure returns (Tile memory){
        self.data[0] &= b.data[0];
        self.data[1] &= b.data[1];
        self.data[2] &= b.data[2];
        return self;
    }

    function subtractWitMask(Tile memory self, Tile memory value, uint256 ignoreMask) internal pure returns (Tile memory) {
        self.data[0] &= ~(value.data[0] & ignoreMask);
        self.data[1] &= ~(value.data[1] & ignoreMask);
        self.data[2] &= ~(value.data[2] & ignoreMask);
        return self;
    }
}
