//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {ERC1155} from "@openzeppelin/contracts-0.8/token/ERC1155/ERC1155.sol";

/// @dev This is NOT a secure ERC1155
/// DO NOT USE in production.
contract ERC1155Mintable is ERC1155 {
    mapping(uint256 => mapping(address => uint256)) public fakeBalance;

    // solhint-disable-next-line no-empty-blocks
    constructor(string memory uri_) ERC1155(uri_) {}

    function mint(
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) external {
        _mint(to, id, amount, data);
    }

    function balanceOf(address owner, uint256 id) public view override returns (uint256) {
        if (fakeBalance[id][owner] != 0) {
            return fakeBalance[id][owner];
        }
        return ERC1155.balanceOf(owner, id);
    }

    function setFakeBalance(
        address owner,
        uint256 id,
        uint256 balance
    ) external {
        fakeBalance[id][owner] = balance;
    }
}
