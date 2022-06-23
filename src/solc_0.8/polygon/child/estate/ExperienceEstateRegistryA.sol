//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {WithSuperOperators} from "../../../common/BaseWithStorage/WithSuperOperators.sol";
import {ERC2771Handler} from "../../../common/BaseWithStorage/ERC2771Handler.sol";
import {EstateGameRecordLib} from "../../../estate/EstateGameRecordLib.sol";
import {ILandToken} from "../../../common/interfaces/ILandToken.sol";
import {IEstateToken} from "../../../common/interfaces/IEstateToken.sol";
import {IEstateExperienceRegistry} from "../../../common/interfaces/IEstateExperienceRegistry.sol";
import {TileLib} from "../../../common/Libraries/TileLib.sol";
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

    uint256 internal constant MAXLANDID = 166463;

    ExperienceTokenInterface public experienceToken;
    IEstateToken public estateToken;
    ILandToken public landToken;

    struct EstateAndLands {
        // I lost track of why we use estate Id... I did something wrong....
        // what I can think of is deleting all links after a burn
        // but we will need a better way to get links from estateId
        //maybe not, if we have the user unlink/retreive the lands before burning
        uint256 estateId;
        // TODO: is better to have a tile here (or both???) ?
        // I agree, will work on it
        // The huge loops are to keep this in-sync. What if we leave broken links and check the linkedLands first
        // If it is not linked we don't use this array
        uint256[] lands;
    }

    struct ExpAndEstate {
        //do we need this struct?
        uint256 expId;
    }

    // should be storageId instead of estateId and expId
    // Experience Id => EstateAndLands
    mapping(uint256 => EstateAndLands) internal links;

    // Land Id => ExpAndEstate
    //changed from ExpAndEstate to uint256 just for expId
    mapping(uint256 => uint256) internal expXLand;
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
            MapLib.TranslateResult memory s = MapLib.translate(template, x, y);
            require(!linkedLands.intersect(s), "already linked");
            // TODO: Maybe this one must take storageId directly
            require(estateToken.contain(estateId, s), "not enough land");
            linkedLands.set(s);
        }

        uint256 estStorageId = estateToken.getStorageId(estateId);

        links[expId].estateId = estStorageId;
        for (uint256 i; i < landCoords.length; i++) {
            // TODO: Check that the template + deltas don't make a mess....
            uint256 landId = landCoords[i] + x + (y * 408);
            links[expId].lands.push(landId);
            expXLand[landId] = expId;
        }
    }

    function unLinkByExperienceId(uint256 expId) external override {
        require(links[expId].lands.length != 0, "unkown experience");
        _unLinkExperience(links[expId].lands);
        delete links[expId];
    }

    function unLinkByLandId(uint256 landId) external override {
        uint256 expId = expXLand[landId];
        require(expId != 0, "unkown land");
        //if we try to access data from an nonexisting land we'll get 0
        //we can use an EnumerableSet with tryget, or set another estateId for single lands
        _unLinkExperience(links[expId].lands);
        delete links[expId];
    }

    // TODO: REVIEW !!!!
    function unLinkExperience(uint256[][3] calldata landToRemove) external override {
        //require(_msgSender() == address(estateToken), "invalid address");
        uint256[] calldata sizes = landToRemove[0];
        uint256[] calldata xs = landToRemove[1];
        uint256[] calldata ys = landToRemove[2];
        for (uint256 i; i < sizes.length; i++) {
            console.log("here here");
            for (uint256 x; x < sizes[i]; x++) {
                for (uint256 y; y < sizes[i]; y++) {
                    // calculate all the land Ids of the quad.
                    uint256 landId = (x + xs[i]) + (y + ys[i]) * 408;
                    // For each land Id get the experienceId and then related lands
                    uint256 expId = expXLand[landId];
                    console.log("expId");
                    console.log(expId);
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
            linkedLands.clear(x, y, 1);
            console.log("unlinking");
            console.log(landId);
            delete expXLand[landId];
        }
    }

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
            require(expXLand[landOrEstateId] == 0, "Land already in use");
            links[expId].estateId = 0;
            links[expId].lands = [landOrEstateId];
            expXLand[landOrEstateId] = expId;
            // expXLand[landOrEstateId].estateId = 0;
            linkedLands.set(x, y, 1);
            //maybe we can set estateId = 0 for single lands
        } else {
            //estate

            (TileLib.Tile memory template, ) = experienceToken.getTemplate();
            MapLib.TranslateResult memory s = MapLib.translate(template, x, y);
            require(!linkedLands.intersect(s), "already linked");
            require(estateToken.contain(landOrEstateId, s), "not enough land");

            uint256 estStorageId = estateToken.getStorageId(landOrEstateId);

            links[expId].estateId = estStorageId;
            links[expId].lands = [landOrEstateId];
            //humm
            expXLand[estStorageId] = expId;
            linkedLands.set(s);
        }
    }
}
