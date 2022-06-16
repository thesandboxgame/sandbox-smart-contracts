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

    function unLinkByExperienceId(uint256 landId) external;

    function unLinkByLandId(uint256 expId) external;

    function unLinkExperience(uint256[][3] calldata landToRemove) external;
}
