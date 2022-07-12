// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {IERC721} from "@openzeppelin/contracts-0.8/token/ERC721/IERC721.sol";
import {Context} from "@openzeppelin/contracts-0.8/utils/Context.sol";
import {IEstateToken} from "../../../common/interfaces/IEstateToken.sol";
import {IEstateExperienceRegistry} from "../../../common/interfaces/IEstateExperienceRegistry.sol";
import {TileLib} from "../../../common/Libraries/TileLib.sol";
import {TileWithCoordLib} from "../../../common/Libraries/TileWithCoordLib.sol";
import {MapLib} from "../../../common/Libraries/MapLib.sol";
import {IExperienceToken} from "../../../common/interfaces/IExperienceToken.sol";

/// @notice Contract managing tExperiences and Estates
contract ExperienceEstateRegistry is Context, IEstateExperienceRegistry {
    using MapLib for MapLib.Map;
    using TileLib for TileLib.Tile;

    struct RelinkData {
        uint256 estateId;
        uint256 expId;
        uint256 x;
        uint256 y;
    }

    IExperienceToken public experienceToken;
    IEstateToken public estateToken;
    IERC721 public landToken;

    struct EstateAndLands {
        // 0 means not found, 1 means single land,  >1 means multiLand with the value estateId - 1,
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
        IExperienceToken _experienceToken,
        //uint8 chainIndex,
        IERC721 _landToken
    ) {
        experienceToken = _experienceToken;
        estateToken = _estateToken;
        landToken = _landToken;
    }

    function linkSingle(
        uint256 expId,
        uint256 x,
        uint256 y
    ) external {
        _link(0, expId, x, y);
    }

    function link(
        uint256 estateId,
        uint256 expId,
        uint256 x,
        uint256 y
    ) external override {
        _link(estateId, expId, x, y);
    }

    function unLink(uint256 expId) external override {
        _unLinkFrom(_msgSender(), expId);
    }

    function relink(uint256[] calldata expIdsToUnlink, RelinkData[] memory expToLink) external {
        _batchUnLinkFrom(_msgSender(), expIdsToUnlink);
        uint256 len = expToLink.length;
        for (uint256 i; i < len; i++) {
            RelinkData memory d = expToLink[i];
            _link(d.estateId, d.expId, d.x, d.y);
        }
    }

    function batchUnLinkFrom(address from, uint256[] calldata expIdsToUnlink) external override {
        require(address(estateToken) == _msgSender(), "can be called only by estate");
        _batchUnLinkFrom(from, expIdsToUnlink);
    }

    // Called by the estate contract to check that the land are ready to remove.
    function isLinked(uint256[][3] calldata quads) external view override returns (bool) {
        uint256 len = quads[0].length;
        for (uint256 i; i < len; i++) {
            if (linkedLands.intersect(quads[1][i], quads[2][i], quads[0][i])) {
                return true;
            }
        }
        return false;
    }

    function isLinked(uint256 expId) external view override returns (bool) {
        uint256 expStorageId = experienceToken.getStorageId(expId);
        EstateAndLands storage est = links[expStorageId];
        return est.estateId > 0;
    }

    function isLinked(TileWithCoordLib.TileWithCoord[] calldata tiles) external view override returns (bool) {
        return linkedLands.intersect(tiles);
    }

    function _link(
        uint256 estateId,
        uint256 expId,
        uint256 x,
        uint256 y
    ) internal {
        uint256 expStorageId = experienceToken.getStorageId(expId);
        (TileLib.Tile memory template, uint256[] memory landCoords) = experienceToken.getTemplate(expStorageId);
        require(landCoords.length > 0, "empty template");
        EstateAndLands storage est = links[expStorageId];
        require(est.estateId == 0, "Exp already in use");

        if (estateId == 0) {
            require(landCoords.length == 1, "must be done inside estate");
            uint256 translatedId = landCoords[0] + x + (y * 408);
            uint256 translatedX = translatedId % 408;
            uint256 translatedY = translatedId / 408;
            require(landToken.ownerOf(translatedId) == _msgSender(), "invalid user");
            //this will revert inside ownerOf with 'not owner of all sub quads not parent quad'
            require(!linkedLands.contain(translatedX, translatedY), "already linked");
            linkedLands.set(translatedX, translatedY, 1);
            est.singleLand = translatedId;
        } else {
            require(estateToken.getOwnerOfStorage(estateId) == _msgSender(), "invalid user");
            MapLib.TranslateResult memory s = MapLib.translate(template, x, y);
            require(!linkedLands.intersect(s), "already linked");
            linkedLands.set(s);
            require(estateToken.contain(estateId, s), "not enough land");
            est.multiLand.set(s);
        }
        est.estateId = estateId + 1;
    }

    function _batchUnLinkFrom(address from, uint256[] calldata expIdsToUnlink) internal {
        uint256 len = expIdsToUnlink.length;
        for (uint256 i; i < len; i++) {
            _unLinkFrom(from, expIdsToUnlink[i]);
        }
    }

    function _unLinkFrom(address from, uint256 expId) internal {
        uint256 expStorageId = experienceToken.getStorageId(expId);
        EstateAndLands storage est = links[expStorageId];
        require(est.estateId > 0, "unknown experience");
        if (est.estateId == 1) {
            uint256 landId = est.singleLand;
            require(landToken.ownerOf(landId) == from, "invalid user");
            uint256 x = landId % 408;
            uint256 y = landId / 408;
            linkedLands.clear(x, y, 1);
        } else {
            require(estateToken.getOwnerOfStorage(est.estateId - 1) == from, "invalid user");
            linkedLands.clear(est.multiLand);
        }
        delete links[expStorageId];
    }
}
