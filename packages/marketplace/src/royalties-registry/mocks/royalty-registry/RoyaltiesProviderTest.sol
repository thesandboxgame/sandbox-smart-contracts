// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {IRoyaltiesProvider} from "../../../interfaces/IRoyaltiesProvider.sol";
import {LibPart} from "../../../lib-part/LibPart.sol";

contract RoyaltiesProviderTest is IRoyaltiesProvider {
    mapping(address => mapping(uint256 => LibPart.Part[])) internal royaltiesTest;

    function initializeProvider(address token, uint256 tokenId, LibPart.Part[] memory royalties) public {
        delete royaltiesTest[token][tokenId];
        for (uint256 i = 0; i < royalties.length; ++i) {
            royaltiesTest[token][tokenId].push(royalties[i]);
        }
    }

    function getRoyalties(address token, uint256 tokenId) external view override returns (LibPart.Part[] memory) {
        return royaltiesTest[token][tokenId];
    }
}
