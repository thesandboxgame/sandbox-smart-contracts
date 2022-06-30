//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {EstateBaseERC721} from "../estate/EstateBaseERC721.sol";

contract TestEstateBaseERC721 is EstateBaseERC721 {
    constructor(
        address trustedForwarder,
        address admin,
        string memory name,
        string memory symbol
    ) {
        initV1(trustedForwarder, admin, name, symbol);
    }

    function initV1(
        address trustedForwarder,
        address admin,
        string memory name,
        string memory symbol
    ) public initializer {
        __EstateBaseERC721_init(trustedForwarder, admin, name, symbol);
    }

    function mint(address to, uint256 tokenId) external {
        _mint(to, tokenId);
    }
}
