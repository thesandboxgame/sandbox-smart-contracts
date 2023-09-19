// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {IERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import {LibERC1155LazyMint} from "./LibERC1155LazyMint.sol";
import {LibPart} from "../../lib-part/LibPart.sol";

/// @title interface for 1155LazyMint
/// @notice contains function signatures for mintAndTransfer and transferFromOrMint
interface IERC1155LazyMint is IERC1155Upgradeable {
    event Supply(uint256 tokenId, uint256 value);
    event Creators(uint256 tokenId, LibPart.Part[] creators);

    /// @notice function to mintAndTransfer
    /// @param data mint data for ERC1155
    /// @param to address that will receive the minted token
    /// @param amount amount of tokens
    function mintAndTransfer(LibERC1155LazyMint.Mint1155Data memory data, address to, uint256 amount) external;

    /// @notice function that transfer a token if already exists, otherwise mint and transfer it
    /// @param data token data
    /// @param from address from which the token is taken or transferred
    /// @param to address that receives the token
    /// @param amount amount of tokens
    function transferFromOrMint(
        LibERC1155LazyMint.Mint1155Data memory data,
        address from,
        address to,
        uint256 amount
    ) external;
}
