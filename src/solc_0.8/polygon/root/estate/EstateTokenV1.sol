//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {StringsUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import {ILandToken} from "../../../common/interfaces/ILandToken.sol";
import {EstateBaseToken} from "../../../estate/EstateBaseToken.sol";
import {MapLib} from "../../../common/Libraries/MapLib.sol";
import {TileWithCoordLib} from "../../../common/Libraries/TileWithCoordLib.sol";

// solhint-disable-next-line no-empty-blocks
contract EstateTokenV1 is EstateBaseToken {
    using MapLib for MapLib.Map;
    event EstateTokenLandsRemoved(uint256 indexed estateId, uint256 indexed newId, uint256[][3] lands);
    event EstateTokenUpdated(
        uint256 indexed oldId,
        uint256 indexed newId,
        uint256[][3] landToAdd,
        uint256[][3] landToRemove
    );

    function initV1(
        address trustedForwarder,
        address admin,
        address land,
        uint8 chainIndex
    ) external initializer {
        _unchained_initV1(trustedForwarder, admin, land, chainIndex);
    }

    function update(
        uint256 estateId,
        uint256[][3] calldata landToAdd,
        uint256[][3] calldata landToRemove
    ) external returns (uint256 newEstateId, uint256 newStorageId) {
        require(_ownerOf(estateId) == _msgSender(), "Invalid Owner");
        uint256 storageId = _storageId(estateId);
        _addLand(_msgSender(), estateId, storageId, landToAdd);
        _removeLand(_msgSender(), estateId, storageId, landToRemove);
        require(_landTileSet(storageId).isAdjacent(), "not adjacent");
        (newEstateId, newStorageId) = _incrementTokenVersion(_msgSender(), estateId);
        emit EstateTokenUpdated(estateId, newEstateId, landToAdd, landToRemove);
        return (newEstateId, newStorageId);
    }

    // Used by the bridge
    function burnEstate(address from, uint256 estateId)
        external
        virtual
        override
        returns (bytes32 metaData, TileWithCoordLib.TileWithCoord[] memory tiles)
    {
        require(hasRole(BURNER_ROLE, _msgSender()), "not burner");
        uint256 storageId = _storageId(estateId);
        metaData = _s().metaData[storageId];
        delete _s().metaData[storageId];
        tiles = _landTileSet(storageId).getMap();
        _landTileSet(storageId).clear();
        _burn(from, _ownerOf(estateId), estateId);
        emit EstateBurned(estateId);
        return (metaData, tiles);
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
                    StringsUpgradeable.toHexString(uint256(_s().metaData[storageId]), 32),
                    "/",
                    "estateTokenV1.json"
                )
            );
    }

    function _removeLand(
        address to,
        uint256,
        uint256 storageId,
        uint256[][3] calldata quads
    ) internal virtual {
        uint256 len = quads[0].length;
        require(len == quads[1].length && len == quads[2].length, "Invalid data");
        MapLib.Map storage map = _landTileSet(storageId);
        for (uint256 i; i < len; i++) {
            require(map.contain(quads[1][i], quads[2][i], quads[0][i]), "Quad missing");
            map.clear(quads[1][i], quads[2][i], quads[0][i]);
        }
        ILandToken(_s().landToken).batchTransferQuad(address(this), to, quads[0], quads[1], quads[2], "");
    }
}
