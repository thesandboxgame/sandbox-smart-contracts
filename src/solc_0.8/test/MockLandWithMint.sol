//SPDX-License-Identifier: MIT
// solhint-disable code-complexity
pragma solidity 0.8.2;

import "../polygon/child/land/PolygonLandBaseToken.sol";

contract MockLandWithMint is PolygonLandBaseToken {
    using AddressUpgradeable for address;

    /***
     **
     * @notice Mint a new quad (aligned to a quad tree with size 3, 6, 12 or 24 only)
     * @param to The recipient of the new quad
     * @param size The size of the new quad
     * @param x The top left x coordinate of the new quad
     * @param y The top left y coordinate of the new quad
     * @param data extra data to pass to the transfer
     */
    function mintQuad(
        address to,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes calldata data
    ) external {
        _mintQuad(to, size, x, y, data);
    }
}
