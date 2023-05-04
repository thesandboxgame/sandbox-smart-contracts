//SPDX-License-Identifier: MIT
// solhint-disable code-complexity
pragma solidity 0.8.2;

import "../polygon/child/land/PolygonLandBaseToken.sol";

contract MockLandWithMint is PolygonLandBaseToken {
    /** @notice Removed caller validations */
    function mint(
        address user,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes memory data
    ) external {
        _mintQuad(user, size, x, y, data);
    }

    function mintQuad(
        address user,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes memory data
    ) external override {
        _mintQuad(user, size, x, y, data);
    }
}
