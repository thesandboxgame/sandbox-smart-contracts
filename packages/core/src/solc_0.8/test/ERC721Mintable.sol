//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {ERC721} from "@openzeppelin/contracts-0.8/token/ERC721/ERC721.sol";

/// @dev This is NOT a secure ERC721
/// DO NOT USE in production.
contract ERC721Mintable is ERC721 {
    mapping(address => uint256) public fakeBalance;

    // solhint-disable-next-line no-empty-blocks
    constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) {}

    function mint(address to, uint256 tokenId) external {
        _mint(to, tokenId);
    }

    function balanceOf(address owner) public view override returns (uint256) {
        if (fakeBalance[owner] != 0) {
            return fakeBalance[owner];
        }
        return ERC721.balanceOf(owner);
    }

    function ownerOf(uint256 tokenId) public view override returns (address) {
        return ERC721.ownerOf(tokenId);
    }

    function setFakeBalance(address owner, uint256 balance) external {
        fakeBalance[owner] = balance;
    }
}
