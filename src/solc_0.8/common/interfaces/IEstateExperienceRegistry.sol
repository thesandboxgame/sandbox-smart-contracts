//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

interface IEstateExperienceRegistry {
    function link(
        uint256 estateId,
        uint256 expId,
        uint256 x,
        uint256 y
    ) external;

    function unLinkByExperienceId(uint256 expId) external;

    function unLinkByLandId(uint256 landId) external;

    function isLinked(uint256[][3] calldata quads) external view returns (bool);
}
