//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import "../Libraries/TileWithCoordLib.sol";
import "./IEstateToken.sol";
import "../Libraries/MapLib.sol";

/// @title Interface for the Estate token

interface IPolygonEstateToken {
    struct RemoveGameData {
        uint256 gameId;
        uint256[][3] quadsToTransfer; //(size, x, y) transfer when adding
        uint256[][3] quadsToFree; //(size, x, y) take from free-lands
    }

    struct AddGameData {
        uint256 gameId;
        uint256[][3] transferQuads; //(size, x, y) transfer when adding
        MapLib.QuadsAndTiles freeLandData;
    }

    struct CreateEstateData {
        MapLib.QuadsAndTiles freeLandData;
        AddGameData[] gameData;
        bytes32 uri;
    }

    struct UpdateEstateData {
        uint256 estateId;
        bytes32 newUri;
        MapLib.QuadsAndTiles freeLandToAdd;
        uint256[][3] freeLandToRemove;
        RemoveGameData[] gamesToRemove;
        AddGameData[] gamesToAdd;
    }

    function createEstate(address from, CreateEstateData calldata data) external returns (uint256);

    function mintEstate(
        address from,
        bytes32 metaData,
        TileWithCoordLib.TileWithCoord[] calldata freeLand
    ) external returns (uint256);

    function updateEstate(address from, UpdateEstateData calldata data) external returns (uint256);

    function burnEstate(address from, uint256 estateId)
        external
        returns (bytes32 metadata, TileWithCoordLib.TileWithCoord[] memory tiles);
}
