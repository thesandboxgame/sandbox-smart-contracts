// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {StringsUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import {IPolygonLand} from "../../../common/interfaces/IPolygonLand.sol";
import {IEstateExperienceRegistry} from "../../../common/interfaces/IEstateExperienceRegistry.sol";
import {MapLib} from "../../../common/Libraries/MapLib.sol";
import {TileWithCoordLib} from "../../../common/Libraries/TileWithCoordLib.sol";
import {EstateBaseToken} from "../../../estate/EstateBaseToken.sol";

contract PolygonEstateTokenV1 is EstateBaseToken {
    using MapLib for MapLib.Map;

    struct PolygonEstateTokenStorage {
        IEstateExperienceRegistry registryToken;
    }

    event EstateTokenUpdated(
        uint256 indexed oldId,
        uint256 indexed newId,
        uint256[][3] landToAdd,
        uint256[] expToUnlink,
        uint256[][3] landToRemove
    );

    function update(
        uint256 oldId,
        uint256[][3] calldata landToAdd,
        uint256[] calldata expToUnlink,
        uint256[][3] calldata landToRemove
    ) external returns (uint256) {
        require(_isApprovedOrOwner(_msgSender(), oldId), "caller is not owner nor approved");
        (Estate storage estate, ) = _estate(oldId);
        _addLand(estate, _msgSender(), landToAdd);
        _removeLand(estate, _msgSender(), landToRemove, expToUnlink);
        require(estate.land.isAdjacent(), "not adjacent");
        estate.id = _incrementTokenVersion(estate.id);
        emit EstateTokenUpdated(oldId, estate.id, landToAdd, expToUnlink, landToRemove);
        return estate.id;
    }

    function burn(
        uint256 estateId,
        uint256[] calldata expToUnlink,
        uint256[][3] calldata landToRemove
    ) external {
        require(_isApprovedOrOwner(_msgSender(), estateId), "caller is not owner nor approved");
        (Estate storage estate, ) = _estate(estateId);
        _removeLand(estate, _msgSender(), landToRemove, expToUnlink);
        require(estate.land.isEmpty(), "map not empty");
        _burnEstate(estate.id);
    }

    function setRegistry(IEstateExperienceRegistry registry) external {
        require(hasRole(ADMIN_ROLE, _msgSender()), "not admin");
        _ps().registryToken = registry;
    }

    function getRegistry() external view returns (IEstateExperienceRegistry) {
        return _ps().registryToken;
    }

    /// @notice Return the URI of a specific token.
    /// @param estateId The id of the token.
    /// @return uri The URI of the token metadata.
    function tokenURI(uint256 estateId) public view override returns (string memory uri) {
        require(ownerOf(estateId) != address(0), "invalid estateId");
        (Estate storage estate, ) = _estate(estateId);
        return
            string(
                abi.encodePacked(
                    "ipfs://bafybei",
                    StringsUpgradeable.toHexString(uint256(estate.metaData), 32),
                    "/",
                    "PolygonEstateTokenV1.json"
                )
            );
    }

    // Complete the removal process.
    function _removeLand(
        Estate storage estate,
        address to,
        uint256[][3] calldata quads,
        uint256[] calldata expToUnlink
    ) internal {
        IEstateExperienceRegistry r = _ps().registryToken;
        if (address(r) != address(0)) {
            r.batchUnLink(expToUnlink);
            require(!r.isLinked(quads), "must unlink first");
        }
        uint256 len = quads[0].length;
        require(len == quads[1].length && len == quads[2].length, "Invalid quad data");
        address landToken = _s().landToken;
        MapLib.Map storage map = estate.land;
        for (uint256 i; i < len; i++) {
            _removeQuad(to, map, landToken, quads[0][i], quads[1][i], quads[2][i]);
        }
    }

    function _removeQuad(
        address to,
        MapLib.Map storage map,
        address landToken,
        uint256 size,
        uint256 x,
        uint256 y
    ) internal {
        require(map.contain(x, y, size), "Quad missing");
        map.clear(x, y, size);
        if (!IPolygonLand(landToken).exists(size, x, y)) {
            IPolygonLand(landToken).mint(to, size, x, y, "");
        } else {
            IPolygonLand(landToken).transferQuad(address(this), to, size, x, y, "");
        }
    }

    function _burnEstate(uint256 estateId)
        internal
        override
        returns (bytes32 metaData, TileWithCoordLib.TileWithCoord[] memory tiles)
    {
        (metaData, tiles) = super._burnEstate(estateId);
        IEstateExperienceRegistry r = _ps().registryToken;
        if (address(r) != address(0)) {
            require(!r.isLinked(tiles), "must unlink first");
        }
        return (metaData, tiles);
    }

    function _ps() internal pure returns (PolygonEstateTokenStorage storage ds) {
        bytes32 storagePosition = keccak256("PolygonEstateToken.PolygonEstateTokenStorage");
        assembly {
            ds.slot := storagePosition
        }
    }
}
