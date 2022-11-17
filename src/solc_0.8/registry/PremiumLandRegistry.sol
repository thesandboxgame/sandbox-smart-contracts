// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {TileWithCoordLib} from "../common/Libraries/TileWithCoordLib.sol";
import {MapLib} from "../common/Libraries/MapLib.sol";
import {IPremiumLandRegistry} from "../common/interfaces/IPremiumLandRegistry.sol";
import {ILandRegistryMixin} from "../common/interfaces/ILandRegistryMixin.sol";

/// @notice A 408x408 matrix of bits, true means that the land is premium
contract PremiumLandRegistry is Initializable, ContextUpgradeable, AccessControlUpgradeable, IPremiumLandRegistry {
    using MapLib for MapLib.Map;
    using TileWithCoordLib for TileWithCoordLib.TileWithCoord;

    // The following role is provided for business-related admin functions
    bytes32 public constant MAP_DESIGNER_ROLE = keccak256("MAP_DESIGNER_ROLE");

    struct PremiumLandRegistryStorage {
        MapLib.Map premiumLand;
        ILandRegistryMixin landToken;
    }

    /// @dev Emitted when a tile is updated
    event TileChanged(TileWithCoordLib.TileWithCoord[]);

    /// @dev Emitted when a tile is updated
    event PremiumQuadSet(uint256 x, uint256 y, uint256 size);

    /// @dev Emitted when a tile is updated
    event PremiumQuadClear(uint256 x, uint256 y, uint256 size);

    function PremiumLandRegistry_init(address admin, ILandRegistryMixin landToken) external initializer {
        require(admin != address(0), "invalid admin address");
        require(address(landToken) != address(0), "invalid landToken address");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _s().landToken = landToken;
    }

    /// @notice set the bits of a premium map
    /// @param xs the x coordinate of the square
    /// @param ys the y coordinate of the square
    /// @param sizes the size of the square
    function batchSet(
        uint256[] memory xs,
        uint256[] memory ys,
        uint256[] memory sizes
    ) external onlyRole(MAP_DESIGNER_ROLE) {
        uint256 len = xs.length;
        require(len == ys.length && len == sizes.length, "invalid arguments");
        for (uint256 i; i < len; i++) {
            _set(xs[i], ys[i], sizes[i]);
        }
    }

    /// @notice set a pixel in the premium map
    /// @dev helper method that can be called by hand
    /// @param x coordinate
    /// @param y coordinate
    function set(
        uint256 x,
        uint256 y,
        uint256 size
    ) external onlyRole(MAP_DESIGNER_ROLE) {
        _set(x, y, size);
    }

    /// @notice clear the bits of a premium map
    /// @param xs the x coordinate of the square
    /// @param ys the y coordinate of the square
    /// @param sizes the size of the square
    function batchClear(
        uint256[] memory xs,
        uint256[] memory ys,
        uint256[] memory sizes
    ) external onlyRole(MAP_DESIGNER_ROLE) {
        uint256 len = xs.length;
        require(len == ys.length && len == sizes.length, "invalid arguments");
        for (uint256 i; i < len; i++) {
            _clear(xs[i], ys[i], sizes[i]);
        }
    }

    /// @notice clear a pixel in the premium map
    /// @dev helper method that can be called by hand
    /// @param x coordinate
    /// @param y coordinate
    function clear(
        uint256 x,
        uint256 y,
        uint256 size
    ) external onlyRole(MAP_DESIGNER_ROLE) {
        _clear(x, y, size);
    }

    /// @notice Check if a map is empty (no bits are set)
    /// @return true if the map is empty
    function isEmpty() external view override returns (bool) {
        return _s().premiumLand.isEmpty();
    }

    /// @notice Check if the bit in certain coordinate are set or not inside the map
    /// @param x the x coordinate
    /// @param y the  coordinate
    /// @return true if the x,y coordinate bit is set or false if it is cleared
    function isPremium(uint256 x, uint256 y) external view override returns (bool) {
        return _s().premiumLand.contain(x, y);
    }

    /// @notice Count the total amount of premium lands (this is not meant to be used on-chain)
    /// @return the amount of premium lands
    function totalPremium() external view returns (uint256) {
        return _s().premiumLand.getLandCount();
    }

    /// @notice Count the amount of premium lands.
    /// @param xs the x coordinate
    /// @param ys the y coordinate
    /// @return the amount of premium lands
    function countPremium(uint256[] calldata xs, uint256[] calldata ys) external view returns (uint256) {
        uint256 len = xs.length;
        require(len == ys.length, "invalid arguments");
        MapLib.Map storage premiumLand = _s().premiumLand;
        uint256 count;
        for (uint256 i; i < len; i++) {
            if (premiumLand.contain(xs[i], ys[i])) count++;
        }
        return count;
    }

    /// @notice Count the amount of premium lands inside the Map filtered by a quad
    /// @dev the coordinates must be % size and size can be 1, 3, 6, 12 and 24 to match the Quads in the land contract
    /// @param x the x coordinate of the square
    /// @param y the y coordinate of the square
    /// @param size the size of the square
    /// @return the amount of premium lands
    function countPremium(
        uint256 x,
        uint256 y,
        uint256 size
    ) external view override returns (uint256) {
        return _getPremiumCant(_s().premiumLand, x, y, size);
    }

    /// @notice Count the amount of premium lands inside the Map filtered by a tile
    /// @param tile the tile with coord used to intersect with the premium map
    /// @return the amount of premium lands
    function countPremium(TileWithCoordLib.TileWithCoord memory tile) external view override returns (uint256) {
        return _s().premiumLand.getLandCount(tile);
    }

    /// @notice Count the amount of premium lands inside the Map filtered by a quad
    /// @dev the coordinates must be % size and size can be 1, 3, 6, 12 and 24 to match the Quads in the land contract
    /// @param xs the x coordinate of the square
    /// @param ys the y coordinate of the square
    /// @param sizes the size of the square
    /// @return the amount of premium lands
    function countPremium(
        uint256[] calldata xs,
        uint256[] calldata ys,
        uint256[] calldata sizes
    ) external view returns (uint256) {
        uint256 len = xs.length;
        require(len == ys.length && len == sizes.length, "invalid arguments");
        MapLib.Map storage premiumLand = _s().premiumLand;
        uint256 count;
        for (uint256 i; i < len; i++) {
            count += _getPremiumCant(premiumLand, xs[i], ys[i], sizes[i]);
        }
        return count;
    }

    /// @notice Check if the all the bits of a square inside the Map are set or not
    /// @dev the coordinates must be % size and size can be 1, 3, 6, 12 and 24 to match the Quads in the land contract
    /// @param x the x coordinate of the square
    /// @param y the y coordinate of the square
    /// @param size the size of the square
    /// @return true if al the bits are set or false if at least one bit is cleared
    function isAllPremium(
        uint256 x,
        uint256 y,
        uint256 size
    ) external view returns (bool) {
        return _s().premiumLand.contain(x, y, size);
    }

    /// @notice Check if a Map includes all the bits that are set in a TileWithCoord
    /// @param tile the TileWithCoord that must be included
    /// @return true if self contain tile TileWithCoord
    function isAllPremium(TileWithCoordLib.TileWithCoord memory tile) external view returns (bool) {
        return _s().premiumLand.contain(tile);
    }

    /// @notice Check if a Map includes all the bits that are set in a TileWithCoord[]
    /// @param tiles the TileWithCoord that must be included
    /// @return true if self contain tiles TileWithCoord[]
    function isAllPremium(TileWithCoordLib.TileWithCoord[] memory tiles) external view returns (bool) {
        return _s().premiumLand.contain(tiles);
    }

    /// @notice Check if a map has at least one bit in common with a square (x,y,size)
    /// @dev the coordinates must be % size and size can be 1, 3, 6, 12 and 24 to match the Quads in the land contract
    /// @param x the x coordinate of the square
    /// @param y the y coordinate of the square
    /// @param size the size of the square
    /// @return true if there is at least one bit set in both the Map and the square
    function isSomePremium(
        uint256 x,
        uint256 y,
        uint256 size
    ) external view returns (bool) {
        return _s().premiumLand.intersect(x, y, size);
    }

    /// @notice Check if a map has at least one bit in common with some TileWithCoord
    /// @param tile the TileWithCoord to compare
    /// @return true if there is at least one bit set in both the Map and the TileWithCoord
    function isSomePremium(TileWithCoordLib.TileWithCoord memory tile) external view returns (bool) {
        return _s().premiumLand.intersect(tile);
    }

    /// @notice Check if a Map has at least one of the bits that are set in a TileWithCoord[]
    // @param tiles the TileWithCoord that must be included
    /// @return true if there is at least one bit set in both the Map and the TileWithCoord[]
    function isSomePremium(TileWithCoordLib.TileWithCoord[] memory tiles) external view returns (bool) {
        return _s().premiumLand.intersect(tiles);
    }

    /// @notice return the length of the internal list of tiles
    /// @dev used to iterate off-chain over the tiles.
    /// @return the length of the list
    function length() external view returns (uint256) {
        return _s().premiumLand.length();
    }

    /// @notice get the tile that is in certain position in the internal list of tiles
    /// @dev used to iterate off-chain over the tiles.
    /// @param index the index of the tile
    /// @return the tile that is in the position index in the list
    function at(uint256 index) external view returns (TileWithCoordLib.TileWithCoord memory) {
        return _s().premiumLand.at(index);
    }

    /// @notice get the internal list of tiles with pagination
    /// @dev used to iterate off-chain over the tiles.
    /// @param offset initial offset used to paginate
    /// @param limit amount of tiles to get
    /// @return the partial list of tiles
    function at(uint256 offset, uint256 limit) external view returns (TileWithCoordLib.TileWithCoord[] memory) {
        return _s().premiumLand.at(offset, limit);
    }

    /// @notice return the internal list of tiles
    /// @dev Use only for testing. This can be problematic if it grows too much !!!
    /// @return the list of internal tiles
    function getMap() external view returns (TileWithCoordLib.TileWithCoord[] memory) {
        return _s().premiumLand.getMap();
    }

    /// @notice count the amount of bits (lands) set inside a Map
    /// @return the quantity of lands
    function getLandCount() external view returns (uint256) {
        return _s().premiumLand.getLandCount();
    }

    /// @notice check if a square is adjacent (4-connected component) to the current map.
    /// @dev used to add a quad to a map, it is cheaper than isAdjacent(map)
    /// @param x the x coordinate of the square
    /// @param y the y coordinate of the square
    /// @param size the size of the square
    /// @return true if the square is 4-connected to the map
    function isAdjacent(
        uint256 x,
        uint256 y,
        uint256 size
    ) external view returns (bool) {
        return _s().premiumLand.isAdjacent(x, y, size);
    }

    function _getPremiumCant(
        MapLib.Map storage premiumLand,
        uint256 x,
        uint256 y,
        uint256 size
    ) internal view returns (uint256) {
        // TODO: check if this optimization saves something
        if (size == 1) {
            if (premiumLand.contain(x, y)) {
                return 1;
            }
            return 0;
        }
        return premiumLand.getLandCount(x, y, size);
    }

    // Change the status of a quad from regular to premium
    function _set(
        uint256 x,
        uint256 y,
        uint256 size
    ) internal {
        MapLib.Map storage premiumLand = _s().premiumLand;
        require(!premiumLand.intersect(x, y, size), "must be regular");
        premiumLand.set(x, y, size);
        _s().landToken.updatePremiumBalances(x, y, size, true);
        emit PremiumQuadSet(x, y, size);
    }

    function _clear(
        uint256 x,
        uint256 y,
        uint256 size
    ) internal {
        MapLib.Map storage premiumLand = _s().premiumLand;
        require(premiumLand.contain(x, y, size), "must be premium");
        premiumLand.clear(x, y, size);
        _s().landToken.updatePremiumBalances(x, y, size, false);
        emit PremiumQuadClear(x, y, size);
    }

    function _s() internal pure returns (PremiumLandRegistryStorage storage ds) {
        bytes32 storagePosition = keccak256("PremiumLandRegistry.PremiumLandRegistryStorage");
        assembly {
            ds.slot := storagePosition
        }
    }

    uint256[50] private __gap;
}
