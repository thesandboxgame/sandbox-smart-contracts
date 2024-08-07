// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/// @title ERC-173 Contract Ownership Standard
/// @custom:security-contact contact-blockchain@sandbox.game
/// @dev See https://github.com/ethereum/EIPs/blob/master/EIPS/eip-173.md
///  Note: the ERC-165 identifier for this interface is 0x7f5828d0
interface IERC173 {
    /// @notice Emitted when ownership of a contract changes.
    /// @param previousOwner the old owner
    /// @param newOwner the new owner
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /// @notice Get the address of the owner
    /// @return The address of the owner.
    function owner() external view returns (address);

    /// @notice Set the address of the new owner of the contract
    /// @param newOwner The address of the new owner of the contract
    function transferOwnership(address newOwner) external;
}
