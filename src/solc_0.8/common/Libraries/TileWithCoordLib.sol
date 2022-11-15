//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {TileLib} from "./TileLib.sol";

/// @title A Tile (24x24 map piece) that also stores x,y coordinates and a combination of the two called key
/// @dev Using a sparse array of TileWithCoords we build a bigger map covered with Tiles
library TileWithCoordLib {
    using TileLib for TileLib.Tile;

    struct TileWithCoord {
        TileLib.Tile tile;
    }

    /// @notice initialize the TileWithCoord structure
    /// @return An empty Tile that has the x,y and corresponding key value set
    function init(uint256 x, uint256 y) internal pure returns (TileWithCoord memory) {
        TileWithCoord memory ret;
        ret.tile.data[0] = (getKey(x, y)) << 224;
        ret.tile.data[1] = (x / 24) << 224;
        ret.tile.data[2] = (y / 24) << 224;
        return ret;
    }

    /// @notice initialize the TileWithCoord structure
    /// @return An TileWithCoord that has the x,y, key and the Tile bit data set
    function init(
        uint256 x,
        uint256 y,
        uint256 pixelData1,
        uint256 pixelData2,
        uint256 pixelData3
    ) internal pure returns (TileWithCoord memory) {
        TileWithCoord memory ret;
        ret.tile = ret.tile.init(pixelData1, pixelData2, pixelData3);
        ret.tile.data[0] |= (getKey(x, y)) << 224;
        ret.tile.data[1] |= (x / 24) << 224;
        ret.tile.data[2] |= (y / 24) << 224;
        return ret;
    }

    /// @notice Set the bits inside a square that has size x size in the x,y coordinates
    /// @param self the TileWithCoord in which the bits are set
    /// @param xi the x coordinate of the square
    /// @param yi the y coordinate of the square
    /// @param size the size of the square
    /// @return self with the corresponding bits set
    function set(
        TileWithCoord memory self,
        uint256 xi,
        uint256 yi,
        uint256 size
    ) internal pure returns (TileWithCoord memory) {
        require(getX(self) == xi / 24 && getY(self) == yi / 24, "Invalid tile coordinates");
        self.tile = self.tile.set(xi % 24, yi % 24, size);
        return self;
    }

    /// @notice Calculates the union/addition of two TileWithCoord
    /// @dev to be able to merge the two TileWithCoord must have the same coordinates
    /// @param self one of the TileWithCoord to merge
    /// @param value the second TileWithCoord to merge
    /// @return the merge of the two TileWithCoord
    function merge(TileWithCoord memory self, TileWithCoord memory value) internal pure returns (TileWithCoord memory) {
        require(getX(self) == getX(value) && getY(self) == getY(value), "Invalid tile coordinates");
        self.tile = self.tile.or(value.tile);
        return self;
    }

    /// @notice Clear the bits inside a square that has size x size in the x,y coordinates
    /// @param self the TileWithCoord, in which the bits will be cleared
    /// @param xi the x coordinate of the square
    /// @param yi the y coordinate of the square
    /// @param size the size of the square
    /// @return self with the corresponding cleared bits
    function clear(
        TileWithCoord memory self,
        uint256 xi,
        uint256 yi,
        uint256 size
    ) internal pure returns (TileWithCoord memory) {
        require(getX(self) == xi / 24 && getY(self) == yi / 24, "Invalid tile coordinates");
        self.tile = self.tile.clear(xi % 24, yi % 24, size);
        return self;
    }

    /// @notice Calculates the subtraction of two TileWithCoord
    /// @dev to be able to subtract them the two TileWithCoord must have the same coordinates
    /// @param self the TileWithCoord to subtract from
    /// @param value the TileWithCoord subtracted
    /// @return the self with all the bits set in value cleared
    function clear(TileWithCoord memory self, TileWithCoord memory value) internal pure returns (TileWithCoord memory) {
        require(getX(self) == getX(value) && getY(self) == getY(value), "Invalid tile coordinates");
        self.tile = self.tile.subtract(value.tile);
        return self;
    }

    /// @notice Check if the bit in certain coordinate are set or not in the TileWithCoord
    /// @param self the TileWithCoord where the check is done
    /// @param xi the x coordinate
    /// @param yi the  coordinate
    /// @return true if the x,y coordinate bit is set or false if it is cleared
    function contain(
        TileWithCoord memory self,
        uint256 xi,
        uint256 yi
    ) internal pure returns (bool) {
        require(getX(self) == xi / 24 && getY(self) == yi / 24, "Invalid coordinates");
        return self.tile.contain(xi % 24, yi % 24);
    }

    /// @notice Check if the all the bits of a square inside the TileWithCoord are set or not
    /// @param self the TileWithCoord where the check is done
    /// @param xi the x coordinate of the square
    /// @param yi the y coordinate of the square
    /// @param size the size of the square
    /// @return true if al the bits are set or false if at least one bit is cleared
    function contain(
        TileWithCoord memory self,
        uint256 xi,
        uint256 yi,
        uint256 size
    ) internal pure returns (bool) {
        require(getX(self) == xi / 24 && getY(self) == yi / 24, "Invalid tile coordinates");
        return self.tile.contain(xi % 24, yi % 24, size);
    }

    /// @notice Check if the TileWithCoord has any bit in common with a square
    /// @param self the TileWithCoord where the check is done
    /// @param xi the x coordinate of the square
    /// @param yi the y coordinate of the square
    /// @param size the size of the square
    /// @return true if there is at least one bit set in the TileWithCoords and the square
    function intersect(
        TileWithCoord memory self,
        uint256 xi,
        uint256 yi,
        uint256 size
    ) internal pure returns (bool) {
        require(getX(self) == xi / 24 && getY(self) == yi / 24, "Invalid tile coordinates");
        return self.tile.intersect(xi % 24, yi % 24, size);
    }

    /// @notice return the key value stored in the TileWithCoord
    /// @param self the TileWithCoord to get the key from
    /// @return the key value
    function getKey(TileWithCoord memory self) internal pure returns (uint256) {
        return self.tile.data[0] >> 224;
    }

    /// @notice return the x coordinate value stored in the TileWithCoord
    /// @param self the TileWithCoord to get the x coordinate from
    /// @return the x value
    function getX(TileWithCoord memory self) internal pure returns (uint256) {
        return self.tile.data[1] >> 224;
    }

    /// @notice return the y coordinate value stored in the TileWithCoord
    /// @param self the TileWithCoord to get the y coordinate from
    /// @return the y value
    function getY(TileWithCoord memory self) internal pure returns (uint256) {
        return self.tile.data[2] >> 224;
    }

    /// @notice helper to calculate the key value given the x,y coordinates
    /// @param x the x coordinate
    /// @param y the y coordinate
    /// @return the key value
    function getKey(uint256 x, uint256 y) internal pure returns (uint256) {
        return (x / 24) | ((y / 24) << 16);
    }

    /// @notice count the amount of bits set inside the TileWithCoord
    /// @param self the TileWithCoord in which the bits are counted
    /// @return the count of bits that are set
    function countBits(TileWithCoord memory self) internal pure returns (uint256) {
        return self.tile.countBits();
    }

    /// @notice check if a TileWithCoord is empty, none of the bits are set
    /// @param self the TileWithCoord to check
    /// @return true if none of the bits are set
    function isEmpty(TileWithCoord memory self) internal pure returns (bool) {
        return self.tile.isEmpty();
    }

    /// @notice Check if two TileWithCoord has exactly the same coordinates and bits set
    /// @param self first TileWithCoord to compare
    /// @param other second TileWithCoord to compare
    /// @return true if the two TileWithCoord has the same coordinates and bits set
    function isEqual(TileWithCoord memory self, TileWithCoord memory other) internal pure returns (bool) {
        return
            self.tile.data[0] == other.tile.data[0] &&
            self.tile.data[1] == other.tile.data[1] &&
            self.tile.data[2] == other.tile.data[2];
    }
}
