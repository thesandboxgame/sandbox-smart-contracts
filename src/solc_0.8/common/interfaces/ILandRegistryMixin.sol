//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

interface ILandRegistryMixin {
    function updatePremiumBalances(
        uint256 x,
        uint256 y,
        uint256 size,
        bool set
    ) external;
}
