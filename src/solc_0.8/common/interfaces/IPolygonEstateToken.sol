//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import "../Libraries/TileWithCoordLib.sol";
import "./IEstateToken.sol";

/// @title Interface for the Estate token

interface IPolygonEstateToken is IEstateToken {
    struct GameCRUD {
        uint256 gameId;
        uint256[][3] quadTupleToAdd; //(size, x, y) transfer when adding
        uint256[][3] quadTupleToUse; //(size, x, y) take from free-lands
        TileWithCoordLib.TileWithCoord[] tilesToUse;
    }

    struct EstateCRUDWithGameData {
        EstateCRUDData estateData;
        GameCRUD[] landAndGameAssociations;
    }

    struct UpdateEstateData {
        uint256[][] landAndGameAssociationsToAdd;
        uint256[][] landAndGameAssociationsToRemove;
        //uint256[] gameIdsToRemain;
        uint256[] landIdsToAdd;
        uint256[] landIdsToRemove;
        uint256[] gameIdsToAdd;
        uint256[] gameIdsToRemove;
        bytes32 uri;
    }

    function createEstateWithGame(address from, EstateCRUDWithGameData calldata creation) external returns (uint256);
}
