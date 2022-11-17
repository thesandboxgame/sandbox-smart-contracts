//SPDX-License-Identifier: MIT
// solhint-disable code-complexity
pragma solidity 0.8.2;

import {PolygonLandV4} from "../polygon/child/land/PolygonLandV4.sol";
import {QuadLib} from "../polygon/common/land/QuadLib.sol";

contract MockLandWithMint is PolygonLandV4 {
    function setAdmin(address admin) external {
        _admin = admin;
    }

    function mint(
        address to,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes memory
    ) external {
        _mintQuad(to, size, x, y);
    }

    /** @notice Removed caller validations */
    function mintQuad(
        address to,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes memory
    ) external override {
        require(to != address(0), "to is zero address");
        // require(isMinter(_msgSender()), "!AUTHORIZED");
        _mintQuad(to, size, x, y);
    }

    /** @notice Removed caller validations */
    function mintAndTransferQuad(
        address to,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes calldata data
    ) external override {
        // require(isMinter(msg.sender), "!AUTHORIZED");
        require(to != address(0), "to is zero address");
        _mintAndTransferQuad(to, size, x, y, data);
    }
}
