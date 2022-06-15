//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {EnumerableSet} from "@openzeppelin/contracts-0.8/utils/structs/EnumerableSet.sol";
import {WithSuperOperators} from "../../../common/BaseWithStorage/WithSuperOperators.sol";
import {ERC2771Handler} from "../../../common/BaseWithStorage/ERC2771Handler.sol";
import {EstateGameRecordLib} from "../../../estate/EstateGameRecordLib.sol";
import {ILandToken} from "../../../common/interfaces/ILandToken.sol";
import {IEstateToken} from "../../../common/interfaces/IEstateToken.sol";
import {TileLib} from "../../../common/Libraries/TileLib.sol";
import {TileWithCoordLib} from "../../../common/Libraries/TileWithCoordLib.sol";
import {MapLib} from "../../../common/Libraries/MapLib.sol";

interface ExperienceTokenInterface {
    function getTemplate() external view returns (TileLib.Tile calldata);
}

/// @notice Contract managing tExperiences and Estates
contract ExperienceEstateRegistry is WithSuperOperators, ERC2771Handler {
    using EstateGameRecordLib for EstateGameRecordLib.Games;
    using MapLib for MapLib.Map;
    using EnumerableSet for EnumerableSet.UintSet;

    ExperienceTokenInterface public experienceToken;
    IEstateToken public estateToken;
    ILandToken public landToken;

    struct EstateAndLands {
        uint256 estateId;
        // TODO: is better to have a tile here ?
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
        IEstateToken _estateToken,
        ExperienceTokenInterface _experienceToken,
        //uint8 chainIndex,
        ILandToken _landToken
    ) {
        experienceToken = _experienceToken;
        estateToken = _estateToken;
        landToken = _landToken;
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
        TileLib.Tile memory template = experienceToken.getTemplate();
        TileWithCoordLib.ShiftResult memory s = TileWithCoordLib.translateTile(template, x, y);
        require(!linkedLands.intersectShiftResult(s), "already linked");
        require(estateToken.containsShiftResult(estId, s), "not enough land");

        // solhint-disable-next-line no-unused-vars
        uint256 expStorageId = estateToken.getStorageId(expId);
        // solhint-disable-next-line no-unused-vars
        uint256 estStorageId = estateToken.getStorageId(estId);
        // solhint-disable-next-line no-unused-vars
        uint256 key = TileWithCoordLib.getKey(x, y);
        //TODO
    }
}
