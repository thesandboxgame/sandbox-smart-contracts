// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract FakeAsset is ERC1155 {
    constructor() ERC1155("https://test.sandbox.game/fake/url/item/{id}.json") {}

    function mint(uint256 id, uint256 amount) public {
        _mint(msg.sender, id, amount, "");
    }
}
