//SPDX-License-Identifier: MIT
// import {IERC721} from "@openzeppelin/contracts-0.8/token/ERC721/IERC721.sol";

pragma solidity 0.8.2;

interface IRootERC721 {
    // is IERC721 {
    // Make sure you implement this method in root ERC721
    // contract when you're interested in transferring
    // metadata from L2 to L1
    function setTokenMetadata(uint256 tokenId, bytes calldata data) external;
}
