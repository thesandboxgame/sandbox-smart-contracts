//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

/// @dev based on Manifoldxyz EIP2981MultiReceiverRoyaltyClonable
interface IEIP2981MultiReceiverRoyaltyClonable {
    /// @dev See {IEIP2981MultiReceiverRoyaltyOverride-setTokenRoyalties}
    function setTokenRoyalties(TokenRoyaltyConfig[] calldata royaltyConfigs) external;

    ///@dev See {IEIP2981MultiReceiverRoyaltyOverride-setDefaultRoyalty}
    function setDefaultRoyalty(uint16 bps, Recipient[] calldata recipients) external;
}
