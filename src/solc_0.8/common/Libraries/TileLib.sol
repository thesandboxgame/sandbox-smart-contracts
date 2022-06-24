//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

/// @title An optimized bitset of 24x24 bits (used to represent maps)
/// @notice see: http://
/// @dev We store 8 lines of 24 bits in each uint256 and leave some free space.
library TileLib {
    uint256 public constant PIXEL_MASK = 0x0000000000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
    uint256 public constant PIXEL_MASK_INV = 0xFFFFFFFFFFFFFFFF000000000000000000000000000000000000000000000000;

    struct Tile {
        uint256[3] data;
    }

    /// @notice makes a copy of a Tile
    /// @param self the Tile to copy
    /// @return A new instance of the Tile copied from self
    function clone(Tile memory self) internal pure returns (Tile memory) {
        return Tile([self.data[0], self.data[1], self.data[2]]);
    }

    /// @notice init the tile with the internal data directly
    /// @return A Tile that has the bit data set
    function init(
        Tile memory self,
        uint256 pixelData1,
        uint256 pixelData2,
        uint256 pixelData3
    ) internal pure returns (Tile memory) {
        self.data[0] = pixelData1 & PIXEL_MASK;
        self.data[1] = pixelData2 & PIXEL_MASK;
        self.data[2] = pixelData3 & PIXEL_MASK;
        return self;
    }

    /// @notice Set the bits inside a square that has size x size in the x,y coordinates
    /// @dev can be optimized for the specific case of a 24x24 square
    /// @param self the Tile in which the bits are set
    /// @param x the x coordinate of the square
    /// @param y the y coordinate of the square
    /// @param size the size of the square
    /// @return self with the corresponding bits set
    function set(
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

    /// @notice Clear the bits inside a square that has size x size in the x,y coordinates
    /// @dev can be optimized for the specific case of a 24x24 square
    /// @param self the Tile in which the bits will be cleared
    /// @param x the x coordinate of the square
    /// @param y the y coordinate of the square
    /// @param size the size of the square
    /// @return self with the corresponding cleared bits
    function clear(
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

    /// @notice Check if the bit in certain coordinate inside the Tile is set or not
    /// @param self the Tile where the check is done
    /// @param x the x coordinate
    /// @param y the  coordinate
    /// @return true if the x,y coordinate bit is set or false if it is cleared
    function contain(
        Tile memory self,
        uint256 x,
        uint256 y
    ) internal pure returns (bool) {
        require(x < 24 && y < 24, "Invalid coordinates");
        uint256 idx = y / 8;
        uint256 bitMask = 1 << (x + 24 * (y % 8));
        return (self.data[idx] & bitMask == bitMask);
    }

    /// @notice Check if the all the bits of a square inside the Tile are set or not
    /// @param self the Tile where the check is done
    /// @param x the x coordinate of the square
    /// @param y the y coordinate of the square
    /// @param size the size of the square
    /// @return true if al the bits are set or false if at least one bit is cleared
    function contain(
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

    /// @notice Check if a Tile includes all the bits that are set in another Tile
    /// @param self the bigger Tile that is checked for inclusion
    /// @param contained the Tile that must be included
    /// @return true if self contain contained Tile
    function contain(Tile memory self, Tile memory contained) internal pure returns (bool) {
        return isEqual(contained, and(clone(contained), self));
    }

    /// @notice Check if two Tiles has any bit in common
    /// @param self first Tile to compare
    /// @param other second tile to compare
    /// @return true if there is at least one bit set in both Tiles
    function intersect(Tile memory self, Tile memory other) internal pure returns (bool) {
        return !isEmpty(and(self, other));
    }

    /// @notice Check if two Tiles has exactly the same bits set
    /// @param self first Tile to compare
    /// @param other second Tile to compare
    /// @return true if the two Tiles has the same bits set
    function isEqual(Tile memory self, Tile memory other) internal pure returns (bool) {
        return
            ((self.data[0] ^ other.data[0]) | (self.data[1] ^ other.data[1]) | (self.data[2] ^ other.data[2])) &
                PIXEL_MASK ==
            0;
    }

    /// @notice return a Tile that is the union of two Tiles
    /// @dev this function destroys data outside the pixel data (we want to save some gas)
    /// @param self first Tile to compare
    /// @param other second Tile to compare
    /// @return a Tile that is the union of self and other
    function or(Tile memory self, Tile memory other) internal pure returns (Tile memory) {
        self.data[0] |= other.data[0] & PIXEL_MASK;
        self.data[1] |= other.data[1] & PIXEL_MASK;
        self.data[2] |= other.data[2] & PIXEL_MASK;
        return self;
    }

    /// @notice return a Tile that is the intersection of two Tiles
    /// @dev this function destroys data outside the pixel data (we want to save some gas)
    /// @param self first Tile to compare
    /// @param other second Tile to compare
    /// @return a Tile that is the intersection of self and other
    function and(Tile memory self, Tile memory other) internal pure returns (Tile memory) {
        self.data[0] &= other.data[0] | PIXEL_MASK_INV;
        self.data[1] &= other.data[1] | PIXEL_MASK_INV;
        self.data[2] &= other.data[2] | PIXEL_MASK_INV;
        return self;
    }

    /// @notice Calculates the subtraction of two Tile
    /// @param self the Tile to subtract from
    /// @param value the Tile subtracted
    /// @return the self with all the bits set in value cleared
    function subtract(Tile memory self, Tile memory value) internal pure returns (Tile memory) {
        self.data[0] &= ~(value.data[0] & PIXEL_MASK);
        self.data[1] &= ~(value.data[1] & PIXEL_MASK);
        self.data[2] &= ~(value.data[2] & PIXEL_MASK);
        return self;
    }

    /// @notice check if a Tile is empty, doesn't have any bit set
    /// @param self first Tile to compare
    /// @return true if the Tile is empty
    function isEmpty(Tile memory self) internal pure returns (bool) {
        return (self.data[0] | self.data[1] | self.data[2]) & PIXEL_MASK == 0;
    }

    /// @notice return a Tile that has only one of the pixels from the original Tile set
    /// @param self Tile in which one pixel is searched
    /// @return ret a Tile that has only one pixel set
    function findAPixel(Tile memory self) internal pure returns (Tile memory ret) {
        uint256 target;
        uint256 shift;

        target = self.data[2] & PIXEL_MASK;
        if (target != 0) {
            shift = _findAPixel(target);
            ret.data[2] = (1 << shift);
            return ret;
        }

        target = self.data[1] & PIXEL_MASK;
        if (target != 0) {
            shift = _findAPixel(target);
            ret.data[1] = (1 << shift);
            return ret;
        }

        target = self.data[0] & PIXEL_MASK;
        if (target != 0) {
            shift = _findAPixel(target);
            ret.data[0] = (1 << shift);
        }
        return ret;
    }

    /// @notice given a tile, translate all the bits in the x and y direction
    /// @param self the initial Tile to translate
    /// @param x the x distance to translate
    /// @param y the y distance to translate
    /// @return col1 first column that represents the four tiles that are the result of the translation
    /// @return col2 second column that represents the four tiles that are the result of the translation
    function translate(
        Tile memory self,
        uint256 x,
        uint256 y
    ) internal pure returns (uint256[6] memory col1, uint256[6] memory col2) {
        // Move right
        uint256 mask = _getTranslateXMask(x);
        col1[0] = (self.data[0] & mask) << x;
        col1[1] = (self.data[1] & mask) << x;
        col1[2] = (self.data[2] & mask) << x;
        if (x > 0) {
            mask = PIXEL_MASK - mask;
            col2[0] = (self.data[0] & mask) >> (24 - x);
            col2[1] = (self.data[1] & mask) >> (24 - x);
            col2[2] = (self.data[2] & mask) >> (24 - x);
        }
        // Move down
        uint256 rem = 24 * (y % 8);
        uint256 div = y / 8;
        mask = PIXEL_MASK - (2**(24 * 8 - rem) - 1);
        // TODO: optimization, remove the loop, check gas consumption
        for (uint256 i = 5; i > div; i--) {
            col1[i] = (col1[i - div] << rem) | ((col1[i - div - 1] & mask) >> (24 * 8 - rem));
            col2[i] = (col2[i - div] << rem) | ((col2[i - div - 1] & mask) >> (24 * 8 - rem));
        }
        col1[div] = col1[0] << rem;
        col2[div] = col2[0] << rem;
        if (div > 0) {
            col1[0] = 0;
            col2[0] = 0;
            if (div > 1) {
                col1[1] = 0;
                col2[1] = 0;
            }
        }
        return (col1, col2);
    }

    uint256 private constant QUAD_MASK_1 = 1;
    uint256 private constant QUAD_MASK_3 = 2**3 - 1;
    uint256 private constant QUAD_MASK_6 = 2**6 - 1;
    uint256 private constant QUAD_MASK_12 = 2**12 - 1;
    uint256 private constant QUAD_MASK_24 = 2**24 - 1;

    /// @notice return a bit mask used to set or clear a square of certain size in the Tile
    /// @param size the size of the square
    /// @return the bit mask or zero if the size is not supported
    function _quadMask(uint256 size) private pure returns (uint256) {
        if (size == 1) return 1;
        if (size == 3) return QUAD_MASK_3;
        if (size == 6) return QUAD_MASK_6;
        if (size == 12) return QUAD_MASK_12;
        if (size == 24) return QUAD_MASK_24;
        return 0;
    }

    /// @notice count the amount of bits set inside the Tile
    /// @param self the Tile in which the bits are counted
    /// @return the count of bits that are set
    function countBits(Tile memory self) internal pure returns (uint256) {
        return _countBits(self.data[0]) + _countBits(self.data[1]) + _countBits(self.data[2]);
    }

    /// @notice count the amount of bits set inside a word
    /// @dev see: https://stackoverflow.com/questions/109023/how-to-count-the-number-of-set-bits-in-a-32-bit-integer
    /// @param x the word in which the bits are counted
    /// @return the count of bits that are set
    function _countBits(uint256 x) private pure returns (uint256) {
        x = x - ((x >> 1) & 0x0000000000000000555555555555555555555555555555555555555555555555);
        x =
            (x & 0x0000000000000000333333333333333333333333333333333333333333333333) +
            ((x >> 2) & 0x0000000000000000333333333333333333333333333333333333333333333333);
        x = (x + (x >> 4)) & 0x00000000000000000F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F;
        return
            ((((x >> 96) * 0x010101010101010101010101) +
                ((x & 0x0F0F0F0F0F0F0F0F0F0F0F0F) * 0x010101010101010101010101)) >> (11 * 8)) & 0xFF;
    }

    /// @notice giving 8 lines of a Tile, find any bit that is set
    /// @dev we must search in 8 * 24 bits that correspond to 8 lines, so 2^6 * 3, we split in three and then do a binary search
    /// @param target the uint256 that has the 8 lines
    /// @return shift the amount of bits shift left so the choose bit is set in the resulting Tile
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

    /// @notice return a bit mask used translate a Tile data in the x direction
    /// @param x the x value to translate
    /// @return the bit mask
    function _getTranslateXMask(uint256 x) private pure returns (uint256) {
        uint256 mask = (2**24 - 1) >> x;
        mask |= mask << 24;
        mask |= mask << (24 * 2);
        mask |= mask << (24 * 4);
        return mask;
    }
}
