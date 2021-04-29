//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import "./ERC1155ERC721.sol";

// solhint-disable-next-line no-empty-blocks
contract AssetV2 is ERC1155ERC721 {
    // polygon-specific layer 1 functionality
    function mintBatch(
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        bytes calldata data
    ) external {
        // @review
        require(_msgSender() == _predicate, "!PREDICATE");
        // operator here could be predicate... is there a benefit?
        // hash should be the bytes32 metaData-hash.
        bytes32 dummyHash = bytes32("0x00");
        address operator = address(uint160(0));
        _mint(dummyHash, amounts[0], 0, operator, to, ids[0], data, false);
    }
}
