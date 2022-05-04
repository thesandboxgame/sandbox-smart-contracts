//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../../../common/interfaces/ILandToken.sol";
import "../../../Game/GameBaseToken.sol";
import "../../../common/Libraries/MapLib.sol";
import "../../../estate/EstateBaseToken.sol";
import "../../../common/interfaces/IEstateToken.sol";
import "../../../common/interfaces/IPolygonEstateToken.sol";
import "../../../estate/GamesDataLib.sol";
import "../../../estate/GamesDataLib.sol";

contract PolygonEstateTokenV1 is EstateBaseToken, Initializable, IPolygonEstateToken {
    using GamesDataLib for GamesDataLib.Games;
    using MapLib for MapLib.Map;

    /// @dev Emits when a estate is updated.
    /// @param oldId The id of the previous erc721 ESTATE token.
    /// @param newId The id of the newly minted token.
    /// @param update The changes made to the Estate.
    event EstateTokenUpdated(uint256 indexed oldId, uint256 indexed newId, IEstateToken.EstateCRUDData update);

    /// @dev Emits when a estate is updated.
    /// @param oldId The id of the previous erc721 ESTATE token.
    /// @param newId The id of the newly minted token.
    /// @param update The changes made to the Estate.
    event EstateTokenUpdatedII(uint256 indexed oldId, uint256 indexed newId, IEstateToken.UpdateEstateLands update);

    // Iterable mapping of games
    mapping(uint256 => GamesDataLib.Games) internal games;

    GameBaseToken public gameToken;

    function initV1(
        address trustedForwarder,
        address admin,
        ILandToken land,
        GameBaseToken _gameToken,
        uint8 chainIndex
    ) public initializer {
        _unchained_initV1(trustedForwarder, admin, land, chainIndex);
        gameToken = _gameToken;
    }

    // TODO: Implement the real thing.
    function createEstateWithGame(address from, EstateCRUDWithGameData calldata creation)
        external
        override
        returns (uint256)
    {
        uint256 estateId;
        uint256 storageId;
        (estateId, storageId) = _createEstate(
            from,
            creation.estateData.tiles,
            creation.estateData.quadTuple,
            creation.estateData.uri
        );
        for (uint256 i; i < creation.landAndGameAssociations.length; i++) {
            _land.batchTransferQuad(
                from,
                address(this),
                creation.landAndGameAssociations[i].quadTupleToAdd[0],
                creation.landAndGameAssociations[i].quadTupleToAdd[1],
                creation.landAndGameAssociations[i].quadTupleToAdd[2],
                ""
            );
            gameToken.transferFrom(from, address(this), creation.landAndGameAssociations[i].gameId);
            require(games[storageId].createGame(creation.landAndGameAssociations[i].gameId), "game id already exists");
            MapLib.Map storage map = games[storageId].getMap(creation.landAndGameAssociations[i].gameId);
            _addQuads(map, creation.landAndGameAssociations[i].quadTupleToAdd);
            _addQuadsFromFreeLand(map, storageId, creation.landAndGameAssociations[i].quadTupleToUse);
            _addTilesFromFreeLand(map, storageId, creation.landAndGameAssociations[i].tilesToUse);
        }
        emit EstateTokenUpdated(0, storageId, creation.estateData);
        return storageId;
    }

    // @todo Add access-control: minter-only? could inherit WithMinter.sol, the game token creator is minter only
    /// @notice Create a new estate token with lands.
    /* /// @param from The address of the one creating the estate.
    /// @param to The address that will own the estate. */
    /// @param creation The data to use to create the estate.
    function createEstate(address from, IEstateToken.EstateCRUDData calldata creation)
        external
        override
        onlyMinter()
        returns (uint256)
    {
        uint256 estateId;
        (estateId, ) = _createEstate(from, creation.tiles, creation.quadTuple, creation.uri);
        emit EstateTokenUpdated(0, estateId, creation);
        return estateId;
    }

    function getGameMap(uint256 estateId, uint256 gameId)
        external
        view
        returns (TileWithCoordLib.TileWithCoord[] memory)
    {
        uint256 storageId = _storageId(estateId);
        return games[storageId].getMap(gameId).getMap();
    }

    function getGamesLength(uint256 estateId) external view returns (uint256) {
        uint256 storageId = _storageId(estateId);
        return games[storageId].length();
    }

    function getGamesId(uint256 estateId, uint256 idx) external view returns (uint256) {
        uint256 storageId = _storageId(estateId);
        return games[storageId].getGameIdAt(idx);
    }

    function updateLandsEstate(address from, IEstateToken.UpdateEstateLands calldata update)
        external
        override
        onlyMinter()
        returns (uint256)
    {
        uint256 newId =
            _updateLandsEstate(
                from,
                update.estateId,
                update.tilesToAdd,
                update.quadsToAdd,
                update.quadsToRemove,
                update.uri
            );
        emit EstateTokenUpdatedII(update.estateId, newId, update);
        return newId;
    }

    function _addQuads(MapLib.Map storage map, uint256[][3] calldata quads) internal {
        for (uint256 i; i < quads[0].length; i++) {
            map.setQuad(quads[1][i], quads[2][i], quads[0][i], _quadMask);
        }
    }

    function _addQuadsFromFreeLand(
        MapLib.Map storage map,
        uint256 storageId,
        uint256[][3] calldata quads
    ) internal {
        require(quads[0].length == quads[1].length && quads[0].length == quads[2].length, "Invalid data");
        for (uint256 i; i < quads[0].length; i++) {
            require(freeLands[storageId].containQuad(quads[1][i], quads[2][i], quads[0][i], _quadMask), "Quad missing");
            freeLands[storageId].clearQuad(quads[1][i], quads[2][i], quads[0][i], _quadMask);
            map.setQuad(quads[1][i], quads[2][i], quads[0][i], _quadMask);
        }
    }

    function _addTilesFromFreeLand(
        MapLib.Map storage map,
        uint256 storageId,
        TileWithCoordLib.TileWithCoord[] calldata tiles
    ) internal {
        for (uint256 i; i < tiles.length; i++) {
            require(freeLands[storageId].containTileWithCoord(tiles[i]), "Tile missing");
            freeLands[storageId].clearTileWithCoord(tiles[i]);
            map.setTileWithCoord(tiles[i]);
        }
    }
}
