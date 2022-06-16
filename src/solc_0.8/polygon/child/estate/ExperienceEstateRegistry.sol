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
import "hardhat/console.sol";

interface ExperienceTokenInterface {
    function getTemplate() external view returns (TileLib.Tile calldata);
}

/// @notice Contract managing tExperiences and Estates
contract ExperienceEstateRegistry is WithSuperOperators, ERC2771Handler {
    using EstateGameRecordLib for EstateGameRecordLib.Games;
    using MapLib for MapLib.Map;
    using EnumerableSet for EnumerableSet.UintSet;

    uint256 internal constant MAXLANDID = 166463;

    ExperienceTokenInterface public experienceToken;
    IEstateToken public estateToken;
    ILandToken public landToken;

    struct EstateAndLands {
        uint256 estateId;
        // TODO: is better to have a tile here ?
        // I agree, will work on it
        uint256[] lands;
    }

    struct ExpAndEstate {
        uint256 expId;
        uint256 estateId;
    }

    //should be storageId instead of estateId and expId
    mapping(uint256 => EstateAndLands) internal links;

    //PLAN A
    mapping(uint256 => ExpAndEstate) internal estateA;
    MapLib.Map internal linkedLands;

    //PLAN B
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

    //I'm going to split this again
    function CreateExperienceLink(
        uint256 x,
        uint256 y,
        uint256 expId,
        uint256 landOrEstateId,
        bool typeA // 1:A 0:B
    ) external {
        //check exist land
        //check exist expId

        if (landOrEstateId < MAXLANDID) {
            require(links[expId].lands.length == 0, "Exp already in use");

            if (typeA) {
                //A
                require(estateA[landOrEstateId].expId == 0, "Land already in use");
                links[expId].estateId = 0;
                links[expId].lands = [landOrEstateId];
                estateA[landOrEstateId].expId = expId;
                estateA[landOrEstateId].estateId = 0;
                linkedLands.setQuad(x, y, 1);
            } else {
                //B
                // solhint-disable-next-line no-unused-vars
                uint256 key = TileWithCoordLib.getKey(x, y);
                //require(estatesB[key][0].length == 0, "land already in use");
            }
            //maybe we can set estateId = 0 for single lands
        } else {
            if (typeA) {
                //estate

                TileLib.Tile memory template = experienceToken.getTemplate();
                TileWithCoordLib.ShiftResult memory s = TileWithCoordLib.translateTile(template, x, y);
                require(!linkedLands.intersectShiftResult(s), "already linked");
                require(estateToken.containsShiftResult(landOrEstateId, s), "not enough land");

                uint256 estStorageId = estateToken.getStorageId(landOrEstateId);
                uint256 key = TileWithCoordLib.getKey(x, y);

                links[expId].estateId = estStorageId;
                links[expId].lands = [landOrEstateId]; //humm
                estateA[estStorageId].expId = expId;
                estateA[estStorageId].estateId = estStorageId;

                linkedLands.setTileWithCoord(s.topLeft);
                linkedLands.setTileWithCoord(s.topRight);
                linkedLands.setTileWithCoord(s.bottomLeft);
                linkedLands.setTileWithCoord(s.bottomRight);
            }
        }
    }
}
