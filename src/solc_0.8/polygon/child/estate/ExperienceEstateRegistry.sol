// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {IERC721} from "@openzeppelin/contracts-0.8/token/ERC721/IERC721.sol";
import {Context} from "@openzeppelin/contracts-0.8/utils/Context.sol";
import {IEstateToken} from "../../../common/interfaces/IEstateToken.sol";
import {IEstateExperienceRegistry} from "../../../common/interfaces/IEstateExperienceRegistry.sol";
import {TileLib} from "../../../common/Libraries/TileLib.sol";
import {MapLib} from "../../../common/Libraries/MapLib.sol";
import "hardhat/console.sol";

interface ExperienceTokenInterface {
    function getTemplate(uint256 expId) external view returns (TileLib.Tile calldata, uint256[] calldata landCoords);
}

/// @notice Contract managing tExperiences and Estates
contract ExperienceEstateRegistry is Context, IEstateExperienceRegistry {
    using MapLib for MapLib.Map;
    using TileLib for TileLib.Tile;

    ExperienceTokenInterface public experienceToken;
    IEstateToken public estateToken;
    IERC721 public landToken;

    struct EstateAndLands {
        uint256 estateId;
        uint256[] lands;
    }

    // Experience Id => EstateAndLands
    mapping(uint256 => EstateAndLands) internal links;

    // TODO: Used only by unlink by landId (this is necessary ?)
    // Land Id => experienceId
    mapping(uint256 => uint256) internal expXLand;
    MapLib.Map internal linkedLands;

    constructor(
        //address trustedForwarder,
        IEstateToken _estateToken,
        ExperienceTokenInterface _experienceToken,
        //uint8 chainIndex,
        IERC721 _landToken
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
        console.log("link estateId", estateId);
        console.log("link expId", expId);
        console.log("link coord", x, y);
        // TODO: This is what we want ?
        _unLinkExperience(expId);

        // Link
        (TileLib.Tile memory template, uint256[] memory landCoords) = experienceToken.getTemplate(expId);
        MapLib.TranslateResult memory s = MapLib.translate(template, x, y);
        require(!linkedLands.intersect(s), "already linked");
        linkedLands.set(s);
        EstateAndLands storage est = links[expId];
        // TODO: Maybe this one must take storageId directly
        if (estateId == 0) {
            require(landCoords.length == 1, "must be done inside estate");
        } else {
            // TODO: storageId or estateId ?
            require(estateToken.contain(estateId, s), "not enough land");
            est.estateId = estateId;
        }

        for (uint256 i; i < landCoords.length; i++) {
            // TODO: Check that the template + deltas don't make a mess....
            uint256 landId = landCoords[i] + x + (y * 408);
            est.lands.push(landId);
            expXLand[landId] = expId;
        }
        require(_isValidUser(est), "invalid user");
    }

    function unLinkByExperienceId(uint256 expId) external override {
        EstateAndLands storage est = links[expId];
        require(est.lands.length != 0, "unknown experience");
        require(_isValidUser(est), "Invalid user");
        _unLinkExperience(expId);
    }

    function unLinkByLandId(uint256 landId) external override {
        uint256 expId = expXLand[landId];
        require(expId != 0, "unknown land");
        EstateAndLands storage est = links[expId];
        require(_isValidUser(est), "Invalid user");
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

    function _isValidUser(EstateAndLands storage est) internal returns (bool) {
        if (est.estateId == 0) {
            assert(est.lands.length == 1);
            console.log("Check ownerOf land", est.lands[0]);
            return landToken.ownerOf(est.lands[0]) == _msgSender();
        }
        console.log("Check ownerOf estate", est.estateId);
        return IERC721(address(estateToken)).ownerOf(est.estateId) == _msgSender();
    }
}
