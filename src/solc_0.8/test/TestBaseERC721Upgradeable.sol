//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {BaseERC721Upgradeable} from "../common/Base/BaseERC721Upgradeable.sol";

contract TestBaseERC721Upgradeable is BaseERC721Upgradeable {
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

    function msgData(bytes calldata) external view returns (bytes calldata) {
        return _msgData();
    }
}
