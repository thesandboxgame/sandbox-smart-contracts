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
        require(x < 408 && y < 408, "invalid coordinates");
        if (isOneLand(self)) {
            self = setMultiLand(self);
        }
        if (isEmpty(self)) {
            self = setOneLand(self, x, y);
        }
        (success, self.tile) = self.tile.addIfNotContain(x, y);
        return (success, self);
    }

    function isEmpty(TileOrLand memory self) internal pure returns (bool) {
        return (self.tile.data[0] >> 253) == 0;
    }

    function isOneLand(TileOrLand memory self) internal pure returns (bool) {
        return (self.tile.data[0] >> 253) == 1;
    }

    function isMultiLand(TileOrLand memory self) internal pure returns (bool) {
        return (self.tile.data[0] >> 253) == 2;
    }

    function setOneLand(
        TileOrLand memory self,
        uint256 x,
        uint256 y
    ) internal pure returns (TileOrLand memory) {
        self.tile.data[0] |= 1 << 253;
        self.tile.data[1] |= x << 224;
        self.tile.data[2] |= y << 224;
        return self;
    }

    function setMultiLand(TileOrLand memory self) internal pure returns (TileOrLand memory) {
        self.tile.data[0] |= 2 << 253;
        return self;
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
}
