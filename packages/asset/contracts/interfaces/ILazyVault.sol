//SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface ILazyVault {
    event Distributed(
        uint8 tier,
        uint256 amount,
        uint256 value,
        address creator,
        uint256 creatorShare,
        uint256 tsbShare
    );

    function distribute(uint8[] calldata tiers, uint256[] calldata amounts, address[] calldata creators) external;
}
