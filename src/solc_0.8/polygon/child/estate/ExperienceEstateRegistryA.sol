//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {EnumerableSet} from "@openzeppelin/contracts-0.8/utils/structs/EnumerableSet.sol";
import {WithSuperOperators} from "../../../common/BaseWithStorage/WithSuperOperators.sol";
import {ERC2771Handler} from "../../../common/BaseWithStorage/ERC2771Handler.sol";
import {EstateGameRecordLib} from "../../../estate/EstateGameRecordLib.sol";
import {ILandToken} from "../../../common/interfaces/ILandToken.sol";
import {IEstateToken} from "../../../common/interfaces/IEstateToken.sol";
import {IEstateExperienceRegistry} from "../../../common/interfaces/IEstateExperienceRegistry.sol";
import {TileLib} from "../../../common/Libraries/TileLib.sol";
import {TileWithCoordLib} from "../../../common/Libraries/TileWithCoordLib.sol";
import {MapLib} from "../../../common/Libraries/MapLib.sol";
import "hardhat/console.sol";

interface ExperienceTokenInterface {
    function getTemplate() external view returns (TileLib.Tile calldata, uint256[] calldata landCoords);
}

/// @notice Contract managing tExperiences and Estates
contract ExperienceEstateRegistryA is WithSuperOperators, ERC2771Handler, IEstateExperienceRegistry {
    using EstateGameRecordLib for EstateGameRecordLib.Games;
    using MapLib for MapLib.Map;
    using TileLib for TileLib.Tile;
    using EnumerableSet for EnumerableSet.UintSet;

    uint256 internal constant MAXLANDID = 166463;

    ExperienceTokenInterface public experienceToken;
    IEstateToken public estateToken;
    ILandToken public landToken;

    struct EstateAndLands {
        // I lost track of why we use estate Id... I did something wrong....
        uint256 estateId;
        // TODO: is better to have a tile here (or both???) ?
        // I agree, will work on it
        // The huge loops are to keep this in-sync. What if we leave broken links and check the linkedLands first
        // If it is not linked we don't use this array
        uint256[] lands;
    }

    struct ExpAndEstate {
        uint256 expId;
    }

    // should be storageId instead of estateId and expId
    // Experience Id => EstateAndLands
    mapping(uint256 => EstateAndLands) internal links;

    // Land Id => ExpAndEstate
    mapping(uint256 => ExpAndEstate) internal expXLand;
    MapLib.Map internal linkedLands;

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

    function link(
        uint256 estateId,
        uint256 expId,
        uint256 x,
        uint256 y
    ) external override {
        (TileLib.Tile memory template, uint256[] memory landCoords) = experienceToken.getTemplate();
        if (landCoords.length == 1) {
            require(estateId == 0, "Invalid estate Id");
        } else {
            TileWithCoordLib.ShiftResult memory s = TileWithCoordLib.translateTile(template, x, y);
            require(!linkedLands.intersectShiftResult(s), "already linked");
            // TODO: Maybe this one must take storageId directly
            require(estateToken.containsShiftResult(estateId, s), "not enough land");
            linkedLands.setTileWithCoord(s.topLeft);
            linkedLands.setTileWithCoord(s.topRight);
            linkedLands.setTileWithCoord(s.bottomLeft);
            linkedLands.setTileWithCoord(s.bottomRight);
        }

        uint256 estStorageId = estateToken.getStorageId(estateId);

        links[expId].estateId = estStorageId;
        for (uint256 i; i < landCoords.length; i++) {
            // TODO: Check that the template + deltas don't make a mess....
            uint256 landId = landCoords[i] + x + (y * 408);
            links[expId].lands.push(landId);
            expXLand[landId].expId = expId;
        }
    }

    function unLinkByExperienceId(uint256 expId) external override {
        _unLinkExperience(links[expId].lands);
        delete links[expId];
    }

    function unLinkByLandId(uint256 landId) external override {
        uint256 expId = expXLand[landId].expId;
        _unLinkExperience(links[expId].lands);
        delete links[expId];
    }

    // TODO: REVIEW !!!!
    function unLinkExperience(uint256[][3] calldata landToRemove) external override {
        require(_msgSender() == address(estateToken), "invalid address");
        uint256[] calldata sizes = landToRemove[0];
        uint256[] calldata xs = landToRemove[1];
        uint256[] calldata ys = landToRemove[2];
        for (uint256 i; i < sizes.length; i++) {
            for (uint256 x; x < sizes[i]; x++) {
                for (uint256 y; y < sizes[i]; y++) {
                    // calculate all the land Ids of the quad.
                    uint256 landId = (x + xs[i]) + (y + ys[i]) * 408;
                    // For each land Id get the experienceId and then related lands
                    uint256 expId = expXLand[landId].expId;
                    // TODO: 1. this is valid ?
                    // TODO: 2. when we call _unLinkExperience we delete the same data we access here but it seems ok
                    if (expId > 0) {
                        // unlink all the related lands
                        _unLinkExperience(links[expId].lands);
                        delete links[expId];
                    }
                }
            }
        }
    }

    function _unLinkExperience(uint256[] memory lands) internal {
        for (uint256 i; i < lands.length; i++) {
            uint256 landId = lands[i];
            uint256 x = landId % 408;
            uint256 y = landId / 408;
            linkedLands.clearQuad(x, y, 1);
            delete expXLand[landId];
        }
    }

    //I'm going to split this again
    function CreateExperienceLink(
        uint256 x,
        uint256 y,
        uint256 expId,
        uint256 landOrEstateId
    ) external {
        //check exist land
        //check exist expId

        if (landOrEstateId < MAXLANDID) {
            require(links[expId].lands.length == 0, "Exp already in use");

            //A
            require(expXLand[landOrEstateId].expId == 0, "Land already in use");
            links[expId].estateId = 0;
            links[expId].lands = [landOrEstateId];
            expXLand[landOrEstateId].expId = expId;
            // expXLand[landOrEstateId].estateId = 0;
            linkedLands.setQuad(x, y, 1);
            //maybe we can set estateId = 0 for single lands
        } else {
            //estate

            (TileLib.Tile memory template, ) = experienceToken.getTemplate();
            TileWithCoordLib.ShiftResult memory s = TileWithCoordLib.translateTile(template, x, y);
            require(!linkedLands.intersectShiftResult(s), "already linked");
            require(estateToken.containsShiftResult(landOrEstateId, s), "not enough land");

            uint256 estStorageId = estateToken.getStorageId(landOrEstateId);

            links[expId].estateId = estStorageId;
            links[expId].lands = [landOrEstateId];
            //humm
            expXLand[estStorageId].expId = expId;

            linkedLands.setTileWithCoord(s.topLeft);
            linkedLands.setTileWithCoord(s.topRight);
            linkedLands.setTileWithCoord(s.bottomLeft);
            linkedLands.setTileWithCoord(s.bottomRight);
        }
    }
}
