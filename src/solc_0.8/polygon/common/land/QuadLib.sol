//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import {QuadTransferredLib} from "./QuadTransferredLib.sol";

library QuadLib {
    using QuadTransferredLib for QuadTransferredLib.QuadTransferred;
    using AddressUpgradeable for address;

    // Our grid is 408 x 408 lands
    uint256 internal constant GRID_SIZE = 408;

    uint256 internal constant LAYER = 0xFF00000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_1x1 = 0x0000000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_3x3 = 0x0100000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_6x6 = 0x0200000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_12x12 = 0x0300000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_24x24 = 0x0400000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant BURNED_FLAG = (2**160);

    struct Land {
        uint256 x;
        uint256 y;
        uint256 size;
    }

    function checkOwner(
        mapping(uint256 => uint256) storage _owners,
        uint256 size,
        uint256 x,
        uint256 y,
        uint256 quadCompareSize
    ) public view {
        _checkOwner(_owners, size, x, y, quadCompareSize);
    }

    function regroupQuad(
        mapping(uint256 => uint256) storage _owners,
        address from,
        address to,
        Land memory land,
        uint256 childQuadSize
    ) public {
        bool ownerOfAll = _regroupQuad(_owners, from, to, land, childQuadSize);
        if (!ownerOfAll) {
            require(_ownerOfQuad(_owners, land.size, land.x, land.y) == from, "not owner of sub quads");
        }
        (uint256 layer, , ) = _getQuadLayer(land.size);
        uint256 quadId = _getQuadIdByLayer(layer, land.x, land.y);
        _owners[quadId] = uint256(uint160(to));
    }

    function checkAndClearOwner(
        mapping(uint256 => uint256) storage _owners,
        Land memory land,
        uint256 quadCompareSize
    ) public returns (QuadTransferredLib.QuadTransferred memory quadTransferred) {
        quadTransferred = QuadTransferredLib.init(land.x, land.y);
        if (land.size > 3) {
            return _checkAndClearOwner(_owners, land, quadTransferred, quadCompareSize);
        }
        return quadTransferred;
    }

    function _checkAndClearOwner(
        mapping(uint256 => uint256) storage _owners,
        Land memory land,
        QuadTransferredLib.QuadTransferred memory quadTransferred,
        uint256 quadCompareSize
    ) internal returns (QuadTransferredLib.QuadTransferred memory) {
        (uint256 layer, , ) = _getQuadLayer(quadCompareSize);
        uint256 toX = land.x + land.size;
        uint256 toY = land.y + land.size;

        for (uint256 xi = land.x; xi < toX; xi += quadCompareSize) {
            for (uint256 yi = land.y; yi < toY; yi += quadCompareSize) {
                bool isQuadChecked = quadTransferred.contain(xi, yi, quadCompareSize);
                if (!isQuadChecked) {
                    uint256 id = _getQuadIdByLayer(layer, xi, yi);
                    address owner = address(uint160(_owners[id]));

                    if (owner == msg.sender) {
                        quadTransferred = quadTransferred.set(xi, yi, quadCompareSize);
                        _owners[id] = 0;
                    } else {
                        require(owner == address(0), "Already minted");
                    }
                }
            }
        }

        quadCompareSize = quadCompareSize / 2;
        if (quadCompareSize >= 3) return _checkAndClearOwner(_owners, land, quadTransferred, quadCompareSize);
        return quadTransferred;
    }

    function _regroupQuad(
        mapping(uint256 => uint256) storage _owners,
        address from,
        address to,
        Land memory land,
        uint256 childQuadSize
    ) internal returns (bool) {
        (, , uint256 childLayer) = _getQuadLayer(land.size);
        bool ownerOfAll = true;

        for (uint256 xi = land.x; xi < land.x + land.size; xi += childQuadSize) {
            for (uint256 yi = land.y; yi < land.y + land.size; yi += childQuadSize) {
                uint256 ownerChild;
                bool ownAllIndividual;
                if (childQuadSize < 3) {
                    ownAllIndividual =
                        _checkAndClear(_owners, from, _getQuadIdByLayer(LAYER_1x1, xi, yi)) &&
                        ownerOfAll;
                } else {
                    ownAllIndividual = _regroupQuad(
                        _owners,
                        from,
                        to,
                        Land({x: xi, y: yi, size: childQuadSize}),
                        childQuadSize / 2
                    );
                    uint256 idChild = _getQuadIdByLayer(childLayer, xi, yi);
                    ownerChild = _owners[idChild];
                    if (ownerChild != 0) {
                        if (!ownAllIndividual) {
                            require(ownerChild == uint256(uint160(from)), "not owner of child Quad");
                        }
                        _owners[idChild] = 0;
                    }
                }
                ownerOfAll = (ownAllIndividual || ownerChild != 0) && ownerOfAll;
            }
        }
        return ownerOfAll;
    }

    function _ownerOfQuad(
        mapping(uint256 => uint256) storage _owners,
        uint256 size,
        uint256 x,
        uint256 y
    ) internal view returns (address) {
        (uint256 layer, uint256 parentSize, ) = _getQuadLayer(size);
        address owner = address(uint160(_owners[_getQuadIdByLayer(layer, (x / size) * size, (y / size) * size)]));
        if (owner != address(0)) {
            return owner;
        } else if (size < 24) {
            return _ownerOfQuad(_owners, parentSize, x, y);
        }
        return address(0);
    }

    function _checkAndClear(
        mapping(uint256 => uint256) storage _owners,
        address from,
        uint256 id
    ) internal returns (bool) {
        uint256 owner = _owners[id];
        if (owner != 0) {
            // TODO: this is different in 0.5 and 0.8 land contract
            require((owner & BURNED_FLAG) != BURNED_FLAG, "not owner");
            require(address(uint160(owner)) == from, "not owner");
            _owners[id] = 0;
            return true;
        }
        return false;
    }

    function _checkOwner(
        mapping(uint256 => uint256) storage _owners,
        uint256 size,
        uint256 x,
        uint256 y,
        uint256 quadCompareSize
    ) internal view {
        (uint256 layer, , ) = _getQuadLayer(quadCompareSize);

        if (size <= quadCompareSize) {
            require(
                _owners[
                    _getQuadIdByLayer(
                        layer,
                        (x / quadCompareSize) * quadCompareSize,
                        (y / quadCompareSize) * quadCompareSize
                    )
                ] == 0,
                "Already minted"
            );
        } else {
            uint256 toX = x + size;
            uint256 toY = y + size;
            for (uint256 xi = x; xi < toX; xi += quadCompareSize) {
                for (uint256 yi = y; yi < toY; yi += quadCompareSize) {
                    require(_owners[_getQuadIdByLayer(layer, xi, yi)] == 0, "Already minted");
                }
            }
        }

        quadCompareSize = quadCompareSize / 2;
        if (quadCompareSize >= 3) _checkOwner(_owners, size, x, y, quadCompareSize);
    }

    function _getQuadLayer(uint256 size)
        internal
        pure
        returns (
            uint256 layer,
            uint256 parentSize,
            uint256 childLayer
        )
    {
        if (size == 1) {
            layer = LAYER_1x1;
            parentSize = 3;
        } else if (size == 3) {
            layer = LAYER_3x3;
            parentSize = 6;
        } else if (size == 6) {
            layer = LAYER_6x6;
            parentSize = 12;
            childLayer = LAYER_3x3;
        } else if (size == 12) {
            layer = LAYER_12x12;
            parentSize = 24;
            childLayer = LAYER_6x6;
        } else if (size == 24) {
            layer = LAYER_24x24;
            childLayer = LAYER_12x12;
        } else {
            require(false, "Invalid size");
        }
    }

    function _getQuadIdByLayer(
        uint256 layer,
        uint256 x,
        uint256 y
    ) internal pure returns (uint256 quadId) {
        quadId = layer + x + y * GRID_SIZE;
    }

    function _getLandId(uint256 x, uint256 y) internal pure returns (uint256 quadId) {
        quadId = x + y * GRID_SIZE;
    }

    function _idInPath(
        uint256 i,
        uint256 size,
        uint256 x,
        uint256 y
    ) internal pure returns (uint256) {
        uint256 row = i / size;
        if (row % 2 == 0) {
            // allow ids to follow a path in a quad
            return _getLandId((x + (i % size)), (y + row));
        } else {
            return _getLandId((x + size) - (1 + (i % size)), (y + row));
        }
    }

    function _getQuadIdBySize(
        uint256 size,
        uint256 x,
        uint256 y
    ) internal pure returns (uint256 id) {
        if (size == 1) {
            id = LAYER_1x1 + x + y * GRID_SIZE;
        } else if (size == 3) {
            id = LAYER_3x3 + x + y * GRID_SIZE;
        } else if (size == 6) {
            id = LAYER_6x6 + x + y * GRID_SIZE;
        } else if (size == 12) {
            id = LAYER_12x12 + x + y * GRID_SIZE;
        } else if (size == 24) {
            id = LAYER_24x24 + x + y * GRID_SIZE;
        } else {
            require(false, "Invalid size");
        }
    }

    function _getQuadById(uint256 id)
        internal
        pure
        returns (
            uint256 size,
            uint256 x,
            uint256 y
        )
    {
        x = _getX(id);
        y = _getY(id);
        uint256 layer = id & LAYER;
        if (layer == LAYER_1x1) {
            size = 1;
        } else if (layer == LAYER_3x3) {
            size = 3;
        } else if (layer == LAYER_6x6) {
            size = 6;
        } else if (layer == LAYER_12x12) {
            size = 12;
        } else if (layer == LAYER_24x24) {
            size = 24;
        } else {
            require(false, "Invalid token id");
        }
    }

    function _getX(uint256 id) internal pure returns (uint256) {
        return ((id << 8) >> 8) % GRID_SIZE;
    }

    function _getY(uint256 id) internal pure returns (uint256) {
        return ((id << 8) >> 8) / GRID_SIZE;
    }

    function _hasLayer(uint256 id) internal pure returns (bool) {
        return id & LAYER != 0;
    }
}
