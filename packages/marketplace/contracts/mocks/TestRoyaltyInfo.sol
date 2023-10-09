// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

/// @title TestRoyaltyInfo contract
/// @dev Implements royaltyInfo function but not supportInferace.
/// @dev used to execute getRoyalties() in RoyaltiesRegistry contract with royaltyType = 3
contract TestRoyaltyInfo {
    function royaltyInfo(
        uint256 /* _tokenId */,
        uint256 /* _salePrice */
    ) external view returns (address receiver, uint256 royaltyAmount) {
        return (msg.sender, 0);
    }
}
