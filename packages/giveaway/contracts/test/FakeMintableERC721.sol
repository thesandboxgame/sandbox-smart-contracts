// SPDX-License-Identifier: MIT
/* solhint-disable no-empty-blocks */
pragma solidity ^0.8;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";

contract FakeMintableERC721 is ERC721Upgradeable {
    constructor() initializer {
        super.__ERC721_init("MINFT", "MINFT");
    }

    function safeMint(address to, uint256 tokenId) public {
        _safeMint(to, tokenId);
    }
}
