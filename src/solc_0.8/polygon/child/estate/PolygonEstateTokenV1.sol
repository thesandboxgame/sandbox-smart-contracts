//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../../../common/interfaces/ILandToken.sol";
import "../../../Game/GameBaseToken.sol";
import "../../../common/Libraries/MapLib.sol";
import "../../../estate/EstateBaseToken.sol";
import "../../../common/interfaces/IPolygonEstateToken.sol";
import "../../../common/interfaces/IPolygonEstateToken.sol";
import "../../../estate/GamesDataLib.sol";
import "../../../estate/GamesDataLib.sol";

contract PolygonEstateTokenV1 is EstateBaseToken, Initializable, IPolygonEstateToken {
    using GamesDataLib for GamesDataLib.Games;
    using MapLib for MapLib.Map;

    event EstateTokenCreated(uint256 indexed estateId, CreateEstateData data);

    event EstateTokenUpdated(uint256 indexed oldId, uint256 indexed newId, UpdateEstateData data);

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

    function createEstate(address from, CreateEstateData calldata data) external override returns (uint256) {
        uint256 estateId;
        uint256 storageId;
        (estateId, storageId) = _createEstate(from, data.freeLandData.tiles, data.freeLandData.quads, data.uri);
        _addGamesToEstate(from, storageId, data.gameData);
        emit EstateTokenCreated(estateId, data);
        return storageId;
    }

    function updateEstate(address from, UpdateEstateData calldata data)
        external
        override
        onlyMinter()
        returns (uint256)
    {
        uint256 newId;
        uint256 storageId;
        (newId, storageId) = _updateLandsEstate(
            from,
            data.estateId,
            data.freeLandToAdd.tiles,
            data.freeLandToAdd.quads,
            data.freeLandToRemove,
            data.newUri
        );
        for (uint256 i; i < data.gamesToRemove.length; i++) {
            MapLib.Map storage map = games[storageId].getMap(data.gamesToRemove[i].gameId);
            _removeQuads(map, data.gamesToRemove[i].quadsToTransfer);
            _land.batchTransferQuad(
                from,
                address(this),
                data.gamesToRemove[i].quadsToTransfer[0],
                data.gamesToRemove[i].quadsToTransfer[1],
                data.gamesToRemove[i].quadsToTransfer[2],
                ""
            );
            _removeQuadsToFreeLand(map, storageId, data.gamesToRemove[i].quadsToFree);

            require(games[storageId].deleteGame(data.gamesToRemove[i].gameId), "game id already exists");
            gameToken.transferFrom(address(this), from, data.gamesToRemove[i].gameId);
        }
        _addGamesToEstate(from, storageId, data.gamesToAdd);
        emit EstateTokenUpdated(data.estateId, newId, data);
        return newId;
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

    function _addGamesToEstate(
        address from,
        uint256 storageId,
        AddGameData[] calldata gameData
    ) internal {
        for (uint256 i; i < gameData.length; i++) {
            gameToken.transferFrom(from, address(this), gameData[i].gameId);
            _land.batchTransferQuad(
                from,
                address(this),
                gameData[i].transferQuads[0],
                gameData[i].transferQuads[1],
                gameData[i].transferQuads[2],
                ""
            );
            require(games[storageId].createGame(gameData[i].gameId), "game id already exists");
            MapLib.Map storage map = games[storageId].getMap(gameData[i].gameId);
            _addQuads(map, gameData[i].transferQuads);
            _addQuadsFromFreeLand(map, storageId, gameData[i].freeLandData.quads);
            _addTilesFromFreeLand(map, storageId, gameData[i].freeLandData.tiles);
        }
    }

    function _addQuadsFromFreeLand(
        MapLib.Map storage map,
        uint256 storageId,
        uint256[][3] calldata quads
    ) internal {
        require(quads[0].length == quads[1].length && quads[0].length == quads[2].length, "Invalid data");
        for (uint256 i; i < quads[0].length; i++) {
            require(freeLands[storageId].containQuad(quads[1][i], quads[2][i], quads[0][i]), "Quad missing");
            freeLands[storageId].clearQuad(quads[1][i], quads[2][i], quads[0][i]);
            map.setQuad(quads[1][i], quads[2][i], quads[0][i]);
        }
    }

    function _removeQuadsToFreeLand(
        MapLib.Map storage map,
        uint256 storageId,
        uint256[][3] calldata quads
    ) internal {
        require(quads[0].length == quads[1].length && quads[0].length == quads[2].length, "Invalid data");
        for (uint256 i; i < quads[0].length; i++) {
            require(map.containQuad(quads[1][i], quads[2][i], quads[0][i]), "Quad missing");
            map.clearQuad(quads[1][i], quads[2][i], quads[0][i]);
            freeLands[storageId].setQuad(quads[1][i], quads[2][i], quads[0][i]);
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

    function _removeQuadsToFreeLand(
        MapLib.Map storage map,
        uint256 storageId,
        TileWithCoordLib.TileWithCoord[] calldata tiles
    ) internal {
        for (uint256 i; i < tiles.length; i++) {
            require(map.containTileWithCoord(tiles[i]), "Tile missing");
            map.clearTileWithCoord(tiles[i]);
            freeLands[storageId].setTileWithCoord(tiles[i]);
        }
    }
}
