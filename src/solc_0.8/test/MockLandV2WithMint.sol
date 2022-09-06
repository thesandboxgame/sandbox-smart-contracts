//SPDX-License-Identifier: MIT
// solhint-disable code-complexity
pragma solidity 0.8.2;

import "../polygon/child/land/PolygonLandBaseTokenV2.sol";

contract MockLandV2WithMint is PolygonLandBaseTokenV2 {
    /** @notice Removed caller validations */
    function mintQuad(
        address user,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes memory data
    ) external override {
        _mintQuad(user, size, x, y, data);
    }

    /** @notice Removed caller validations */
    function mintAndTransferQuad(
        address to,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes calldata data
    ) external override {
        require(to != address(0), "to is zero address");

        if (exists(size, x, y)) {
            _transferQuad(msg.sender, to, size, x, y);
            _numNFTPerAddress[msg.sender] -= size * size;
            _numNFTPerAddress[to] += size * size;
            _checkBatchReceiverAcceptQuad(msg.sender, msg.sender, to, size, x, y, data);
        } else {
            _mintAndTransferQuad(to, size, x, y, data);
        }
    }
}
