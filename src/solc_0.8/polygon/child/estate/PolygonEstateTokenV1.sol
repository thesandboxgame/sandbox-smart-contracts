//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {Strings} from "@openzeppelin/contracts-0.8/utils/Strings.sol";
import {IPolygonLand} from "../../../common/interfaces/IPolygonLand.sol";
import {IEstateExperienceRegistry} from "../../../common/interfaces/IEstateExperienceRegistry.sol";
import {MapLib} from "../../../common/Libraries/MapLib.sol";
import {TileWithCoordLib} from "../../../common/Libraries/TileWithCoordLib.sol";
import {EstateBaseToken} from "../../../estate/EstateBaseToken.sol";

contract PolygonEstateTokenV1 is EstateBaseToken, Initializable {
    using MapLib for MapLib.Map;
    event EstateTokenLandsRemoved(uint256 indexed estateId, uint256 indexed newId, uint256[][3] lands);
    event EstateTokenUpdated(
        uint256 indexed oldId,
        uint256 indexed newId,
        uint256[][3] landToAdd,
        uint256[][3] landToRemove
    );

    struct PolygonEstateTokenStorage {
        IEstateExperienceRegistry registryToken;
    }

    function initV1(
        address trustedForwarder,
        address admin,
        address land,
        uint8 chainIndex
    ) external initializer {
        _unchained_initV1(trustedForwarder, admin, land, chainIndex);
    }

    function setRegistry(IEstateExperienceRegistry registry) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "not admin");
        _ps().registryToken = registry;
    }

    /// @dev estateId = 0 => 1x1 experiences
    // TODO: maybe we can use sizes[], xs[], ys[]
    function link(
        uint256 estateId,
        uint256 expId,
        uint256 x,
        uint256 y
    ) external {
        _ps().registryToken.link(estateId, expId, x, y);
    }

    function unLink(uint256 expId) external {
        _ps().registryToken.unLink(expId);
    }

    function update(
        uint256 estateId,
        uint256[][3] calldata landToAdd,
        uint256[][3] calldata landToRemove,
        uint256[] calldata expToUnlink
    ) external returns (uint256 newEstateId, uint256 newStorageId) {
        require(_ownerOf(estateId) == _msgSender(), "Invalid Owner");
        uint256 storageId = _storageId(estateId);
        _addLand(_msgSender(), estateId, storageId, landToAdd);
        _removeLand(_msgSender(), estateId, storageId, landToRemove, expToUnlink);
        require(_landTileSet(storageId).isAdjacent(), "not adjacent");
        (newEstateId, newStorageId) = _incrementTokenVersion(_msgSender(), estateId);
        emit EstateTokenUpdated(estateId, newEstateId, landToAdd, landToRemove);
        return (newEstateId, newStorageId);
    }

    function removeLand(
        uint256 estateId,
        uint256[][3] calldata landToRemove,
        uint256[] calldata expToUnlink
    ) external returns (uint256 newEstateId, uint256 newStorageId) {
        require(_ownerOf(estateId) == _msgSender(), "Invalid Owner");
        uint256 storageId = _storageId(estateId);
        _removeLand(_msgSender(), estateId, storageId, landToRemove, expToUnlink);
        require(_landTileSet(storageId).isAdjacent(), "not adjacent");
        (newEstateId, newStorageId) = _incrementTokenVersion(_msgSender(), estateId);
        emit EstateTokenLandsRemoved(estateId, newEstateId, landToRemove);
        return (newEstateId, newStorageId);
    }

    function getRegistry() external view returns (IEstateExperienceRegistry) {
        return _ps().registryToken;
    }

    /// @notice Return the URI of a specific token.
    /// @param estateId The id of the token.
    /// @return uri The URI of the token metadata.
    function tokenURI(uint256 estateId) external view override returns (string memory uri) {
        require(_ownerOf(estateId) != address(0), "BURNED_OR_NEVER_MINTED");
        uint256 storageId = _storageId(estateId);
        return
            string(
                abi.encodePacked(
                    "ipfs://bafybei",
                    Strings.toHexString(uint256(_s().metaData[storageId]), 32),
                    "/",
                    "PolygonEstateTokenV1.json"
                )
            );
    }

    // Complete the removal process.
    function _removeLand(
        address to,
        uint256,
        uint256 storageId,
        uint256[][3] calldata quads,
        uint256[] calldata expToUnlink
    ) internal {
        if (address(_ps().registryToken) != address(0)) {
            _ps().registryToken.batchUnLink(expToUnlink);
            require(!_ps().registryToken.isLinked(quads), "must unlink first");
        }
        uint256 len = quads[0].length;
        require(len == quads[1].length && len == quads[2].length, "Invalid data");
        MapLib.Map storage map = _landTileSet(storageId);
        for (uint256 i; i < len; i++) {
            require(map.contain(quads[1][i], quads[2][i], quads[0][i]), "Quad missing");
            map.clear(quads[1][i], quads[2][i], quads[0][i]);
            uint256 size = quads[0][i];
            uint256 x = quads[1][i];
            uint256 y = quads[2][i];
            if (!IPolygonLand(_s().landToken).exists(size, x, y)) {
                IPolygonLand(_s().landToken).mint(to, size, x, y, "");
            } else {
                IPolygonLand(_s().landToken).transferQuad(address(this), to, size, x, y, "");
            }
        }
    }

    function _ps() internal pure returns (PolygonEstateTokenStorage storage ds) {
        bytes32 storagePosition = keccak256("PolygonEstateToken.PolygonEstateTokenStorage");
        assembly {
            ds.slot := storagePosition
        }
    }
}
