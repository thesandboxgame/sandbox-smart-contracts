//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-0.8/utils/Strings.sol";
import "../../../common/interfaces/IPolygonLand.sol";
import "../../../common/Libraries/MapLib.sol";
import "../../../common/interfaces/IPolygonEstateToken.sol";
import "../../../estate/EstateBaseToken.sol";
import "../../../estate/EstateGameRecordLib.sol";
import "../../../Game/GameBaseToken.sol";

contract PolygonEstateTokenV1 is EstateBaseToken, Initializable, IPolygonEstateToken {
    using EstateGameRecordLib for EstateGameRecordLib.Games;
    using Strings for uint256;
    using MapLib for MapLib.Map;

    event EstateTokenCreated(uint256 indexed estateId, CreateEstateData data);

    event EstateTokenUpdated(uint256 indexed oldId, uint256 indexed newId, UpdateEstateData data);

    // Iterable mapping of games
    mapping(uint256 => EstateGameRecordLib.Games) internal games;

    GameBaseToken public gameToken;

    function initV1(
        address trustedForwarder,
        address admin,
        address land,
        GameBaseToken _gameToken,
        uint8 chainIndex
    ) external initializer {
        _unchained_initV1(trustedForwarder, admin, land, chainIndex);
        gameToken = _gameToken;
    }

    function createEstate(address from, CreateEstateData calldata data) external override returns (uint256) {
        uint256 estateId;
        uint256 storageId;
        (estateId, storageId) = _createEstate(from, data.freeLandData, data.uri);
        _addGamesToEstate(from, storageId, data.gameData);
        emit EstateTokenCreated(estateId, data);
        return storageId;
    }

    function updateEstate(address from, UpdateEstateData calldata data) external override returns (uint256) {
        uint256 newId;
        uint256 storageId;
        (newId, storageId) = _updateLandsEstate(from, data.estateId, data.freeLandToAdd, data.newUri);
        freeLands[storageId].remove(data.freeLandToRemove);
        uint256 len = data.freeLandToRemove[0].length;
        for (uint256 i; i < len; i++) {
            uint256 size = data.freeLandToRemove[0][i];
            uint256 x = data.freeLandToRemove[1][i];
            uint256 y = data.freeLandToRemove[2][i];
            // TODO: Can we move this to the land contract ??? something like mintOrTransfer so we avoid 3 calls
            if (!IPolygonLand(land).exists(size, x, y)) {
                IPolygonLand(land).mint(from, size, x, y, "");
            } else {
                IPolygonLand(land).transferQuad(address(this), from, size, x, y, "");
            }
        }
        len = data.gamesToRemove.length;
        for (uint256 i; i < len; i++) {
            MapLib.Map storage map = games[storageId].getMap(data.gamesToRemove[i].gameId);
            _batchTransferQuad(
                from,
                address(this),
                data.gamesToRemove[i].quadsToTransfer[0],
                data.gamesToRemove[i].quadsToTransfer[1],
                data.gamesToRemove[i].quadsToTransfer[2]
            );
            map.remove(data.gamesToRemove[i].quadsToTransfer);
            map.moveTo(freeLands[storageId], data.gamesToRemove[i].quadsToFree);

            require(games[storageId].deleteGame(data.gamesToRemove[i].gameId), "game id already exists");

            gameToken.transferFrom(address(this), from, data.gamesToRemove[i].gameId);
        }
        _addGamesToEstate(from, storageId, data.gamesToAdd);
        emit EstateTokenUpdated(data.estateId, newId, data);
        return newId;
    }

    function mintEstate(
        address from,
        bytes32 metaData,
        TileWithCoordLib.TileWithCoord[] calldata freeLand
    ) external override returns (uint256) {
        return _mintEstate(from, metaData, freeLand);
    }

    function burnEstate(address from, uint256 estateId)
        external
        override
        returns (bytes32 metadata, TileWithCoordLib.TileWithCoord[] memory tiles)
    {
        uint256 storageId = _storageId(estateId);
        require(games[storageId].isEmpty(), "still have games");
        return _burnEstate(from, estateId, storageId);
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

    /// @notice Return the URI of a specific token.
    /// @param gameId The id of the token.
    /// @return uri The URI of the token metadata.
    function tokenURI(uint256 gameId) external view override returns (string memory uri) {
        require(_ownerOf(gameId) != address(0), "BURNED_OR_NEVER_MINTED");
        uint256 id = _storageId(gameId);
        // return string(abi.encodePacked("ipfs://bafybei", hash2base32(metaData[id]), "/", "game.json"));
        // TODO: We need this to reduce the size, probably we can put hash2base32 in a library
        return string(abi.encodePacked("ipfs://bafybei", uint256(metaData[id]).toHexString(32), "/", "game.json"));
    }

    function _addGamesToEstate(
        address from,
        uint256 storageId,
        AddGameData[] calldata gameData
    ) internal {
        uint256 len = gameData.length;
        for (uint256 i; i < len; i++) {
            gameToken.transferFrom(from, address(this), gameData[i].gameId);
            _batchTransferQuad(
                from,
                address(this),
                gameData[i].transferQuads[0],
                gameData[i].transferQuads[1],
                gameData[i].transferQuads[2]
            );
            require(games[storageId].createGame(gameData[i].gameId), "game already exists");
            MapLib.Map storage map = games[storageId].getMap(gameData[i].gameId);
            // TODO: Check if it is better to add to free land and then to game
            map.add(gameData[i].transferQuads);
            freeLands[storageId].moveTo(map, gameData[i].freeLandData);
        }
    }
}
