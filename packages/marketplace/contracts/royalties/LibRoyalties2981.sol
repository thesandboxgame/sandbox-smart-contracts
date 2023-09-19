// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {LibPart} from "../lib-part/LibPart.sol";

/// @title library for constants and functions related to ERC2891
/// @notice standard for signature validation
library LibRoyalties2981 {
    bytes4 public constant _INTERFACE_ID_ROYALTIES = 0x2a55205a;
    uint96 internal constant _WEIGHT_VALUE = 1e6;

    /// @notice method for converting amount to percent and forming LibPart
    /// @param to recipient of royalties
    /// @param amount of royalties
    /// @return LibPart with account and value
    function calculateRoyalties(address to, uint256 amount) internal pure returns (LibPart.Part[] memory) {
        LibPart.Part[] memory result;
        if (amount == 0) {
            return result;
        }
        uint256 percent = (amount * 10000) / _WEIGHT_VALUE;
        require(percent < 10000, "Royalties 2981 exceeds 100%");
        result = new LibPart.Part[](1);
        result[0].account = payable(to);
        result[0].value = uint96(percent);
        return result;
    }
}
