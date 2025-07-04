// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MockERC721 is ERC721 {
    mapping(uint256 => address) private _tokenOwners;

    constructor(string memory name, string memory symbol) ERC721(name, symbol) {}

    function mint(address to, uint256 tokenId) external {
        _mint(to, tokenId);
        _tokenOwners[tokenId] = to;
    }

    function setOwner(uint256 tokenId, address owner) external {
        _tokenOwners[tokenId] = owner;
    }

    function ownerOf(uint256 tokenId) public view virtual override returns (address) {
        address owner = _tokenOwners[tokenId];
        if (owner == address(0)) {
            revert ERC721NonexistentToken(tokenId);
        }
        return owner;
    }
} 