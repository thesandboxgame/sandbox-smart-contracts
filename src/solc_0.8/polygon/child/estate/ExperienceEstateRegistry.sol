// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {WithSuperOperators} from "../../../common/BaseWithStorage/WithSuperOperators.sol";
import {ERC2771Handler} from "../../../common/BaseWithStorage/ERC2771Handler.sol";
import {ILandToken} from "../../../common/interfaces/ILandToken.sol";
import {IEstateToken} from "../../../common/interfaces/IEstateToken.sol";
import {IEstateExperienceRegistry} from "../../../common/interfaces/IEstateExperienceRegistry.sol";
import {TileLib} from "../../../common/Libraries/TileLib.sol";
import {MapLib} from "../../../common/Libraries/MapLib.sol";
import "hardhat/console.sol";

interface ExperienceTokenInterface {
    function getTemplate(uint256 expId) external view returns (TileLib.Tile calldata, uint256[] calldata landCoords);
}

/// @notice Contract managing tExperiences and Estates
contract ExperienceEstateRegistry is WithSuperOperators, ERC2771Handler, IEstateExperienceRegistry {
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
        // maybe not, if we have the user unlink/retreive the lands before burning
        uint256 estateId;
        uint256[] lands;
    }

    // should be storageId instead of estateId and expId
    // Experience Id => EstateAndLands
    mapping(uint256 => EstateAndLands) internal links;

    // Land Id => experienceId
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
        // TODO: This is ok ?
        _unLinkExperience(expId);

        // Link
        (TileLib.Tile memory template, uint256[] memory landCoords) = experienceToken.getTemplate(expId);
        MapLib.TranslateResult memory s = MapLib.translate(template, x, y);
        // TODO: Maybe this one must take storageId directly
        if (estateId == 0) {
            require(landCoords.length == 1, "must be done inside estate");
        } else {
            require(estateToken.contain(estateId, s), "not enough land");
            links[expId].estateId = estateToken.getStorageId(estateId);
        }
        require(!linkedLands.intersect(s), "already linked");
        linkedLands.set(s);

        for (uint256 i; i < landCoords.length; i++) {
            // TODO: Check that the template + deltas don't make a mess....
            uint256 landId = landCoords[i] + x + (y * 408);
            links[expId].lands.push(landId);
            expXLand[landId] = expId;
        }
    }

    function unLinkByExperienceId(uint256 expId) external override {
        require(links[expId].lands.length != 0, "unknown experience");
        _unLinkExperience(expId);
    }

    function unLinkByLandId(uint256 landId) external override {
        uint256 expId = expXLand[landId];
        require(expId != 0, "unknown land");
        // if we try to access data from an nonexisting land we'll get 0
        // we can use an EnumerableSet with try get, or set another estateId for single lands
        _unLinkExperience(expId);
    }

    // Called by the estate contract to check that the land are ready to remove.
    function isLinked(uint256[][3] calldata quads) external view override returns (bool) {
        uint256 len = quads.length;
        for (uint256 i; i < len; i++) {
            if (linkedLands.intersect(quads[1][i], quads[2][i], quads[0][i])) {
                return true;
            }
        }
        return false;
    }

    function _unLinkExperience(uint256 expId) internal {
        console.log("unlinking", expId);
        uint256[] memory lands = links[expId].lands;
        for (uint256 i; i < lands.length; i++) {
            uint256 landId = lands[i];
            uint256 x = landId % 408;
            uint256 y = landId / 408;
            linkedLands.clear(x, y, 1);
            console.log(landId);
            delete expXLand[landId];
        }
        delete links[expId];
    }

    // TODO: Remove and fix the tests (or remove them).
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
            (TileLib.Tile memory template, ) = experienceToken.getTemplate(expId);
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
