// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import {MintableERC721, ERC721} from "./MintableERC721.sol";
import {ERC2981} from "./ERC2981.sol";

contract MintableERC721WithRoyalties is MintableERC721, ERC2981 {
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC2981) returns (bool) {
        return ERC721.supportsInterface(interfaceId) || ERC2981.supportsInterface(interfaceId);
    }

    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    function deleteDefaultRoyalty() external {
        _deleteDefaultRoyalty();
    }

    function setTokenRoyalty(uint256 tokenId, address receiver, uint96 feeNumerator) external {
        _setTokenRoyalty(tokenId, receiver, feeNumerator);
    }

    function resetTokenRoyalty(uint256 tokenId) external {
        _resetTokenRoyalty(tokenId);
    }
}
