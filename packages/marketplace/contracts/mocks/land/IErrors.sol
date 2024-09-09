//SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

/// @title Errors
/// @author The Sandbox
/// @custom:security-contact contact-blockchain@sandbox.game
/// @notice Common errors
interface IErrors {
    /// @notice an address passed as argument is invalid
    error InvalidAddress();

    /// @notice an argument passed is invalid
    error InvalidArgument();

    /// @notice an array argument has an invalid length
    error InvalidLength();

    /// @notice only admin can call this function
    error OnlyAdmin();

    error ERC721InvalidOwner(address owner);

    error ERC721NonexistentToken(uint256 tokenId);

    error ERC721InvalidSender(address sender);

    error ERC721InvalidReceiver(address receiver);

    error ERC721InsufficientApproval(address operator, uint256 tokenId);

    error ERC721InvalidApprover(address approver);

    error ERC721InvalidOperator(address operator);
}
