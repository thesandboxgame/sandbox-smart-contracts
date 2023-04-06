//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-fixed
pragma solidity 0.5.9;

interface ERC721TokenReceiver {
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);
}
