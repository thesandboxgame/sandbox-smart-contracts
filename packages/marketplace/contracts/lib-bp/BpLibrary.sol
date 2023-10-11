// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

/// @title library for Base Point calculation
/// @notice contains a method for basepoint calculation
library BpLibrary {
    uint256 internal constant BASIS_POINTS = 10000;

    /// @notice basepoint calculation
    /// @param value value to be multiplied by basepoint
    /// @param bpValue basepoint value
    /// @return value times basepoint divided by base point (10000)
    function bp(uint256 value, uint256 bpValue) internal pure returns (uint256) {
        return (value * bpValue) / BASIS_POINTS;
    }
}
