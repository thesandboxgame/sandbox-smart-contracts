//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {TileWithCoordLib} from "../../../common/Libraries/TileWithCoordLib.sol";

library QuadTransferredLib {
    using TileWithCoordLib for TileWithCoordLib.TileWithCoord;

    struct QuadTransferred {
        TileWithCoordLib.TileWithCoord quad;
        uint256 cant;
    }

    function init(uint256 xi, uint256 yi) internal pure returns (QuadTransferred memory) {
        return QuadTransferred({quad: TileWithCoordLib.init(xi, yi), cant: 0});
    }

    function contain(
        QuadTransferred memory self,
        uint256 xi,
        uint256 yi,
        uint256 size
    ) internal pure returns (bool) {
        return self.quad.contain(xi, yi, size);
    }

    function contain(
        QuadTransferred memory self,
        uint256 xi,
        uint256 yi
    ) internal pure returns (bool) {
        return self.quad.contain(xi, yi);
    }

    function set(
        QuadTransferred memory self,
        uint256 xi,
        uint256 yi,
        uint256 size
    ) internal pure returns (QuadTransferred memory) {
        self.quad = self.quad.set(xi, yi, size);
        self.cant += size * size;
        return self;
    }

    function set(
        QuadTransferred memory self,
        uint256 xi,
        uint256 yi
    ) internal pure returns (QuadTransferred memory) {
        self.quad = self.quad.set(xi, yi, 1);
        self.cant++;
        return self;
    }

    function count(QuadTransferred memory self) internal pure returns (uint256) {
        return self.cant;
    }
}
