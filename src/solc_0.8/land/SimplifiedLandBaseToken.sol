//SPDX-License-Identifier: MIT
/* solhint-disable func-order, code-complexity */
pragma solidity 0.8.2;

import "../common/BaseWithStorage/ERC721BaseToken.sol";

contract SimplifiedLandBaseToken is ERC721BaseToken {
    // Our grid is 408 x 408 lands
    uint256 internal constant GRID_SIZE = 408;
    // set ChildChainManager as only minter for Polygon, but keep flexibility for other L2s
    mapping(address => bool) internal _minters;

    constructor(
        address trustedForwarder,
        uint8 chainIndex,
        address admin
    ) {
        _admin = admin;
        ERC721BaseToken.__ERC721BaseToken_initialize(chainIndex);
        ERC2771Handler.__ERC2771Handler_initialize(trustedForwarder);
    }

    /// @notice check whether address `who` is given minter rights.
    /// @param who The address to query.
    /// @return whether the address has minter rights.
    function isMinter(address who) public view returns (bool) {
        return _minters[who];
    }

    /// @notice total width of the map
    /// @return width
    function width() external pure returns (uint256) {
        return GRID_SIZE;
    }

    /// @notice total height of the map
    /// @return height
    function height() external pure returns (uint256) {
        return GRID_SIZE;
    }

    /// @notice x coordinate of Land token
    /// @param id tokenId
    /// @return the x coordinates
    function x(uint256 id) external view returns (uint256) {
        require(_ownerOf(id) != address(0), "token does not exist");
        return id % GRID_SIZE;
    }

    /// @notice y coordinate of Land token
    /// @param id tokenId
    /// @return the y coordinates
    function y(uint256 id) external view returns (uint256) {
        require(_ownerOf(id) != address(0), "token does not exist");
        return id / GRID_SIZE;
    }
}
