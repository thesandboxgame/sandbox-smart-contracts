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
        uint256 singleLand;
        MapLib.Map multiLand;
    }

    // Experience Id => EstateAndLands
    mapping(uint256 => EstateAndLands) internal links;

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
        // TODO: This is what we want ?
        // TODO: This affect the test: trying to create a link with a land already in use should revert
        // _unLinkExperience(expId);

        // Link
        (TileLib.Tile memory template, uint256[] memory landCoords) = experienceToken.getTemplate(expId);
        require(landCoords.length > 0, "empty template");

        EstateAndLands storage est = links[expId];
        // TODO: Maybe this one must take storageId directly
        if (estateId == 0) {
            require(landCoords.length == 1, "must be done inside estate");
            uint256 translatedId = landCoords[0] + x + (y * 408);
            uint256 translatedX = translatedId % 408;
            uint256 translatedY = translatedId / 408;
            require(!linkedLands.contain(translatedX, translatedY), "already linked");
            linkedLands.set(translatedX, translatedY, 1);
            est.singleLand = translatedId;
        } else {
            MapLib.TranslateResult memory s = MapLib.translate(template, x, y);
            require(!linkedLands.intersect(s), "already linked");
            linkedLands.set(s);
            // TODO: storageId or estateId ?
            require(estateToken.contain(estateId, s), "not enough land");
            est.estateId = estateId;
            est.multiLand.set(s);
        }
        require(_isValidUser(est), "invalid user");
    }

    function unLink(uint256 expId) external override {
        _unLink(expId);
    }

    function batchUnLink(uint256[] calldata expIdsToUnlink) external override {
        uint256 len = expIdsToUnlink.length;
        for (uint256 i; i < len; i++) {
            _unLink(expIdsToUnlink[i]);
        }
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

    function _unLink(uint256 expId) internal {
        EstateAndLands storage est = links[expId];
        if (est.estateId == 0) {
            require(est.singleLand != 0, "unknown experience");
        } else {
            require(!est.multiLand.isEmpty(), "unknown experience");
        }
        require(_isValidUser(est), "Invalid user");
        _unLinkExperience(expId);
    }

    function _unLinkExperience(uint256 expId) internal {
        EstateAndLands storage est = links[expId];
        if (est.estateId == 0) {
            uint256 landId = est.singleLand;
            uint256 x = landId % 408;
            uint256 y = landId / 408;
            linkedLands.clear(x, y, 1);
        } else {
            linkedLands.clear(est.multiLand);
        }
        delete links[expId];
    }

    function _isValidUser(EstateAndLands storage est) internal returns (bool) {
        if (est.estateId == 0) {
            return landToken.ownerOf(est.singleLand) == _msgSender();
        }
        return IERC721(address(estateToken)).ownerOf(est.estateId) == _msgSender();
    }
}
