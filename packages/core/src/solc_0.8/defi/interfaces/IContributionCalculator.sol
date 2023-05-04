//SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

/// @title Plugins for the SandRewardPool that calculate the contributions must implement this interface
interface IContributionCalculator {
    /// @notice based on the user stake and address calculate the contribution
    /// @param account address of the user that is staking tokens
    /// @param amountStaked the amount of tokens stacked
    function computeContribution(address account, uint256 amountStaked) external returns (uint256);
}
