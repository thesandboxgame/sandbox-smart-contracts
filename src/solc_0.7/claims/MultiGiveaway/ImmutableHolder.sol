//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ImmutableHolder {
    uint256 internal constant MAX_UINT256 = 2**256 - 1;
    bool internal _initialized;

    function approve(
        IERC721[] calldata erc721s,
        IERC1155[] calldata erc1155s,
        IERC20[] calldata erc20s
    ) external {
        require(!_initialized, "ALREADY_INITIALISED");
        _initialized = true;
        for (uint256 i = 0; i < erc721s.length; i++) {
            erc721s[i].setApprovalForAll(msg.sender, true);
        }
        for (uint256 i = 0; i < erc1155s.length; i++) {
            erc1155s[i].setApprovalForAll(msg.sender, true);
        }
        for (uint256 i = 0; i < erc20s.length; i++) {
            erc20s[i].approve(msg.sender, MAX_UINT256);
        }
    }
}
