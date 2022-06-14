//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;
pragma experimental ABIEncoderV2;

import "../../../common/BaseWithStorage/WithSuperOperators.sol";
import "../../../common/BaseWithStorage/ERC2771Handler.sol";
import "../../../estate/EstateGameRecordLib.sol";
import "./PolygonEstateTokenV1.sol";
import "../../../Game/GameBaseToken.sol";
import "../../../common/interfaces/ILandToken.sol";
import "hardhat/console.sol";
import "@openzeppelin/contracts-0.8/utils/structs/EnumerableMap.sol";

/// @notice Contract managing tExperiences and Estates
contract ExperienceEstateRegistry is WithSuperOperators, ERC2771Handler {
    using EstateGameRecordLib for EstateGameRecordLib.Games;
    using EnumerableMap for EnumerableMap.Map;
    using MapLib for MapLib.Map;

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
    mapping(uint256 => EstateAndLands) internal links;

    //PLAN A
    //map[landid]=(expId, estateId?)
    mapping(uint256 => ExpAndEstate) internal estatesA;
    //linkend lands tileset
    MapLib.Map internal linkedLands;

    //PLAN B
    //map[expId]=(estateId,[landids (array or tileset?)])
    mapping(uint256 => EnumerableMap.Map) internal estatesB;

    //Map[ (x %24 , y % 24) ] => (iterable map(landId) => experienceId)

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

    function CreateExperienceEstateLink(
        uint256 x,
        uint256 y,
        uint256 expId,
        uint256 estId //TileWithCoordLib.TileWithCoord[] calldata tiles
    ) external {
        uint256 expStorageId = estateToken.getStorageId(expId);
        uint256 estStorageId = estateToken.getStorageId(estId);
        uint256 key = TileWithCoordLib.getKey(x, y);
        //TODO
    }
}
