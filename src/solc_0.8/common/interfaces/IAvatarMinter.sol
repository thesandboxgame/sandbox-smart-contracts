//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

interface IAvatarMinter {
    function mint(address to, uint256 id) external;

    function mintBatch(address to, uint256[] calldata ids) external;

    /**
     * @dev We don't always implement {IMintableERC721-exists} but this one is a nice to have.
     */
    function exists(uint256 tokenId) external view returns (bool);
}
