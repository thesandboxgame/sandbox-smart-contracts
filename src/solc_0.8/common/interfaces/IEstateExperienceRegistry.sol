//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

interface IEstateExperienceRegistry {
    function link(
        uint256 estateId, // estateId == 0 => single land experience
        uint256 expId,
        uint256 x,
        uint256 y
    ) external;

    function unLink(uint256 expId) external;

    function batchUnLink(uint256[] calldata expIdsToUnlink) external;

    function isLinked(uint256[][3] calldata quads) external view returns (bool);
}
