// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {IRoyaltiesProvider} from "../interfaces/IRoyaltiesProvider.sol";

contract RoyaltiesProviderMock is IRoyaltiesProvider {
    mapping(address => mapping(uint256 => Part[])) internal royaltiesTest;

    function getRoyalties(address token, uint256 tokenId) external view override returns (Part[] memory) {
        return royaltiesTest[token][tokenId];
    }

    function initializeProvider(address token, uint256 tokenId, Part[] memory royalties) public {
        delete royaltiesTest[token][tokenId];
        for (uint256 i = 0; i < royalties.length; ++i) {
            royaltiesTest[token][tokenId].push(royalties[i]);
        }
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(IRoyaltiesProvider) returns (bool) {
        return interfaceId == type(IRoyaltiesProvider).interfaceId;
    }
}
