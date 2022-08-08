//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {TileLib} from "./TileLib.sol";

/// @title A representation of a Tile (24x24 map piece) or only one land
/// @dev apart from the pixel data we store in data[0] higher bit a one to detect emptiness
/// @dev in data[1] higher bit if it is a single land and and in data[2] << 224 the landId
library TileOrLandLib {
    using TileLib for TileLib.Tile;

    struct TileOrLand {
        TileLib.Tile tile;
    }

    function addIfNotContain(
        TileOrLand memory self,
        uint256 x,
        uint256 y
    ) internal pure returns (bool success, TileOrLand memory) {
        if (isEmpty(self)) {
            self.tile.data[1] |= x << 224;
            self.tile.data[2] |= y << 224;
        }
        (success, self.tile) = self.tile.addIfNotContain(x, y);
        return (success, self);
    }

    function isEmpty(TileOrLand memory self) internal pure returns (bool) {
        return self.tile.isEmpty();
    }

    function isOneLand(TileOrLand memory self) internal pure returns (bool) {
        return self.tile.countBits() == 1;
    }

    function isMultiLand(TileOrLand memory self) internal pure returns (bool) {
        return self.tile.countBits() > 1;
    }

    function isValid(TileOrLand memory self) internal pure returns (bool) {
        if (isEmpty(self)) {
            return getX(self) == 0 && getY(self) == 0;
        }
        if (isOneLand(self)) {
            uint256 x = getX(self);
            uint256 y = getY(self);
            return x < 24 && y < 24 && self.tile.contain(x, y);
        }
        return isAdjacent(self);
    }

    function getX(TileOrLand memory self) internal pure returns (uint256) {
        return self.tile.data[1] >> 224;
    }

    function getY(TileOrLand memory self) internal pure returns (uint256) {
        return self.tile.data[2] >> 224;
    }

    function getTile(TileOrLand memory self) internal pure returns (TileLib.Tile memory) {
        return self.tile.init(self.tile.data[0], self.tile.data[1], self.tile.data[2]);
    }

    /// @notice check that the TileOrLand has only one 4-connected component, aka everything is adjacent
    /// @param self the TileOrLand
    /// @return ret true if all the bits (lands) are adjacent
    function isAdjacent(TileOrLand memory self) internal pure returns (bool ret) {
        TileLib.Tile memory selfTile = getTile(self);
        TileLib.Tile memory spot = selfTile.findAPixel();
        bool done;
        while (!done) {
            (spot, done) = floodStep(selfTile, spot);
        }
        return selfTile.isEqual(spot);
    }

    uint256 private constant LEFT_MASK = 0x000001000001000001000001000001000001000001000001;
    uint256 private constant LEFT_MASK_NEG = ~LEFT_MASK;
    uint256 private constant RIGHT_MASK = 0x800000800000800000800000800000800000800000800000;
    uint256 private constant RIGHT_MASK_NEG = ~RIGHT_MASK;
    uint256 private constant UP_MASK = 0x000000000000000000000000000000000000000000FFFFFF;
    uint256 private constant DOWN_MASK = 0xFFFFFF000000000000000000000000000000000000000000;

    /// @notice used to check adjacency. See: https://en.wikipedia.org/wiki/Flood_fill and isAdjacent.
    /// @param selfTile the tile part of TileOrLand
    /// @param current the current image
    /// @return next return the image with the extra pixels that correspond to the flooding process
    /// @return done true if the current image is the same as the next one so the algorithm is ready to stop flooding.
    function floodStep(TileLib.Tile memory selfTile, TileLib.Tile memory current)
        internal
        pure
        returns (TileLib.Tile memory next, bool done)
    {
        // grow
        next.data[0] = _grow(current.data[0]) | ((current.data[1] & UP_MASK) << (24 * 7));
        next.data[1] =
            _grow(current.data[1]) |
            ((current.data[2] & UP_MASK) << (24 * 7)) |
            ((current.data[0] & DOWN_MASK) >> (24 * 7));
        next.data[2] = _grow(current.data[2]) | ((current.data[1] & DOWN_MASK) >> (24 * 7));

        // Mask it.
        next.data[0] &= selfTile.data[0];
        next.data[1] &= selfTile.data[1];
        next.data[2] &= selfTile.data[2];
        return (
            next,
            next.data[0] == current.data[0] && next.data[1] == current.data[1] && next.data[2] == current.data[2]
        );
    }

    /// @notice grow (4-connected) the internal word that represent 8 lines of the tile adding pixels
    /// @param x the value of the internal work
    /// @return the internal work with the extra pixels from growing it
    function _grow(uint256 x) private pure returns (uint256) {
        return (x | ((x & RIGHT_MASK_NEG) << 1) | ((x & LEFT_MASK_NEG) >> 1) | (x << 24) | (x >> 24));
    }
}
