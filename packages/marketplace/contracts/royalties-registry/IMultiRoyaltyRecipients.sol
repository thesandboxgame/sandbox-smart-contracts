// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/// @title interface for MultiRoyaltyRecipients
/// @notice Multi-receiver EIP2981 reference override implementation
interface IMultiRoyaltyRecipients is IERC165 {
    struct Recipient {
        address payable recipient;
        uint16 bps;
    }

    /// @notice get recipients of token royalties
    /// @param tokenId token identifier
    /// @return array of royalties recipients
    function getRecipients(uint256 tokenId) external view returns (Recipient[] memory);
}
