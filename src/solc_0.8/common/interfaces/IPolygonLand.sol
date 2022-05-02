//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./ILandToken.sol";

interface IPolygonLand is LandToken {
    function mintQuad(
        address user,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes memory data
    ) external;

    // @temp - Will remove once locking mechanism has been tested
    // function exit(uint256 tokenId) external;

    function exists(
        uint256 size,
        uint256 x,
        uint256 y
    ) external view returns (bool);
}
