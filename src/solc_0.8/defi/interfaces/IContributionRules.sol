//SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

/// @title Plugins for the ERC20RewardPool that calculates the contributions (multipliers) must implement this interface
interface IContributionRules {
    /// @notice based on the user stake and address apply the contribution rules
    /// @param account address of the user that is staking tokens
    /// @param amountStaked the amount of tokens stacked
    function computeMultiplier(address account, uint256 amountStaked) external returns (uint256);
}
