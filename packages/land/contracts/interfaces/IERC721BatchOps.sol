//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/// @title IERC721BatchOps
/// @author The Sandbox
/// @custom:security-contact contact-blockchain@sandbox.game
/// @notice ERC721 Batch operations
interface IERC721BatchOps {
    /// @notice Transfer many tokens between 2 addresses.
    /// @param from The sender of the token.
    /// @param to The recipient of the token.
    /// @param ids The ids of the tokens.
    /// @param data Additional data.
    function batchTransferFrom(address from, address to, uint256[] calldata ids, bytes calldata data) external;

    /// @notice Transfer many tokens between 2 addresses, while
    /// ensuring the receiving contract has a receiver method.
    /// @param from The sender of the token.
    /// @param to The recipient of the token.
    /// @param ids The ids of the tokens.
    /// @param data Additional data.
    function safeBatchTransferFrom(address from, address to, uint256[] calldata ids, bytes calldata data) external;
}
