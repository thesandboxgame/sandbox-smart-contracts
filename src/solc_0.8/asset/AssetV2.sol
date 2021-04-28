//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import "./ERC1155ERC721.sol";

// solhint-disable-next-line no-empty-blocks
contract AssetV2 is ERC1155ERC721 {
    // polygon-specific layer 1 functionality
    // IBurnableERC1155, IMintableERC1155
    function mint(
        address account,
        uint256 id,
        uint256 amount,
        bytes calldata data
    ) external {
        // @review
        // predicate-only !
        // _mint(account, id, amount, data);
    }

    function mintBatch(
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        bytes calldata data
    ) external {
      // @review
        // predicate-only !
        // _mintBatch(to, ids, amounts, data);
    }

}
