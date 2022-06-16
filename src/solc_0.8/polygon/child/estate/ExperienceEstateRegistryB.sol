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
    function getTemplate() external view returns (TileLib.Tile calldata, uint256[] calldata landCoords);
}

/// @notice Contract managing tExperiences and Estates
contract ExperienceEstateRegistryB is WithSuperOperators, ERC2771Handler {
    using EstateGameRecordLib for EstateGameRecordLib.Games;
    using MapLib for MapLib.Map;
    using TileLib for TileLib.Tile;
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

    // Land Id %24 (aka tile coords) => Land Id
    mapping(uint256 => EnumerableSet.UintSet) internal estates;

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
        uint256 landOrEstateId
    ) external {
        //check exist land
        //check exist expId

        if (landOrEstateId < MAXLANDID) {
            require(links[expId].lands.length == 0, "Exp already in use");
            // solhint-disable-next-line no-unused-vars
            uint256 key = TileWithCoordLib.getKey(x, y);
            //require(estatesB[key][0].length == 0, "land already in use");
            //maybe we can set estateId = 0 for single lands
        }
    }
}
