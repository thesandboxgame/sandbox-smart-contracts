//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {TileWithCoordLib} from "../Libraries/TileWithCoordLib.sol";

interface IEstateExperienceRegistry {
    function link(
        uint256 estateId, // estateId == 0 => single land experience
        uint256 expId,
        uint256 x,
        uint256 y
    ) external;

    function unLink(uint256 expId) external;

    // Called only by the estate contract
    function batchUnLinkFrom(address from, uint256[] calldata expIdsToUnlink) external;

    function isLinked(uint256 expId) external view returns (bool);

    function isLinked(uint256[][3] calldata quads) external view returns (bool);

    function isLinked(TileWithCoordLib.TileWithCoord[] calldata) external view returns (bool);
}
