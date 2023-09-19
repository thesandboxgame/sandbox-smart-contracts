// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

/// @title library for parts of transaction fees
/// @notice contains the struct for Part, containing the fee recipient and value
library LibPart {
    /// @notice type hash of Part struct
    /// @return hash of Part struct
    bytes32 public constant TYPE_HASH = keccak256("Part(address account,uint96 value)");

    struct Part {
        address payable account;
        uint96 value;
    }

    /// @notice hash part object
    /// @param part to be hashed
    /// @return resulting hash
    function hash(Part memory part) internal pure returns (bytes32) {
        return keccak256(abi.encode(TYPE_HASH, part.account, part.value));
    }
}
