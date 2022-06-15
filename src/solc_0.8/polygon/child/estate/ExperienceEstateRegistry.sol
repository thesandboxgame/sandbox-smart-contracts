//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../../../common/BaseWithStorage/WithSuperOperators.sol";
import "../../../common/BaseWithStorage/ERC2771Handler.sol";
import "../../../estate/EstateGameRecordLib.sol";
import "./PolygonEstateTokenV1.sol";
import "../../../Game/GameBaseToken.sol";
import "../../../common/interfaces/ILandToken.sol";
import "@openzeppelin/contracts-0.8/utils/structs/EnumerableSet.sol";

/// @notice Contract managing tExperiences and Estates
contract ExperienceEstateRegistry is WithSuperOperators, ERC2771Handler {
    using EstateGameRecordLib for EstateGameRecordLib.Games;
    using MapLib for MapLib.Map;
    using EnumerableSet for EnumerableSet.UintSet;

    GameBaseToken public gameToken;
    PolygonEstateTokenV1 public estateToken;
    ILandToken public landToken;

    struct EstateAndLands {
        uint256 estateId;
        uint256[] lands;
    }

    struct ExpAndEstate {
        uint256 expId;
        uint256 estateId;
    }

    //should be storageId instead of estateId and expId
    //map[expId]=(estateId,[landids (array or tileset?)])
    mapping(uint256 => EstateAndLands) internal links;

    //PLAN A
    //map[landid]=(expId, estateId?)
    mapping(uint256 => ExpAndEstate) internal estateA;
    //linkend lands tileset
    MapLib.Map internal linkedLands;

    //PLAN B
    //Map[ (x %24 , y % 24) ] => (iterable map(landId) => experienceId)
    mapping(uint256 => mapping(uint256 => EnumerableSet.UintSet)) internal estatesB;

    constructor(
        //address trustedForwarder,
        PolygonEstateTokenV1 _estateToken,
        GameBaseToken _gameToken,
        //uint8 chainIndex,
        ILandToken _land
    ) {
        gameToken = _gameToken;
        estateToken = _estateToken;
        landToken = _land;
    }

    //I'll merge both fucntions
    function CreateExperienceLandLink(
        uint256 expId,
        uint256 landId,
        bool typeA // 1:A 0:B
    ) external {
        //check exist land
        //check exist expId

        //uint256 expStorageId = estateToken.getStorageId(expId);
        require(links[expId].lands.length == 0, "Exp already in use");

        if (typeA) {
            //A
            require(estateA[landId].expId == 0, "Land already in use");

            uint256 x = landToken.getX(landId);
            uint256 y = landToken.getY(landId);

            links[expId].estateId = 0;
            links[expId].lands = [landId];
            estateA[landId].expId = expId;
            estateA[landId].estateId = 0;
            linkedLands.setQuad(x, y, 1);
        } else {
            //B
            uint256 x = landToken.getX(landId);
            uint256 y = landToken.getY(landId);
            // solhint-disable-next-line no-unused-vars
            uint256 key = TileWithCoordLib.getKey(x, y);
            //require(estatesB[key][0].length == 0, "land already in use");
        }
        //maybe we can set estateId = 0 for single lands
    }

    function CreateExperienceEstateLink(
        uint256 x,
        uint256 y,
        uint256 expId,
        uint256 estId //TileWithCoordLib.TileWithCoord[] calldata tiles
    ) external {
        // solhint-disable-next-line no-unused-vars
        uint256 expStorageId = estateToken.getStorageId(expId);
        // solhint-disable-next-line no-unused-vars
        uint256 estStorageId = estateToken.getStorageId(estId);
        // solhint-disable-next-line no-unused-vars
        uint256 key = TileWithCoordLib.getKey(x, y);
        //TODO
    }
}
