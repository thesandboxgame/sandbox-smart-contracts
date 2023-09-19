// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {IERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import {LibERC721LazyMint} from "./LibERC721LazyMint.sol";
import {LibPart} from "../../lib-part/LibPart.sol";

/// @title interface for ERC721LazyMint
/// @notice contains function signatures for mintAndTransfer and transferFromOrMint
interface IERC721LazyMint is IERC721Upgradeable {
    /// @notice event for listing the creators or fee partakers of a token
    /// @param tokenId uint256 token identifier
    /// @param creators array of participants
    event Creators(uint256 tokenId, LibPart.Part[] creators);

    /// @notice function to mintAndTransfer
    /// @param data mint data for ERC721
    /// @param to address that will receive the minted token
    function mintAndTransfer(LibERC721LazyMint.Mint721Data memory data, address to) external;

    /// @notice function that transfer a token if already exists, otherwise mint and transfer it
    /// @param data token data
    /// @param from address from which the token is taken or transferred
    /// @param to address that receives the token
    function transferFromOrMint(LibERC721LazyMint.Mint721Data memory data, address from, address to) external;
}
