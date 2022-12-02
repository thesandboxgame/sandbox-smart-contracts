//SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

/// @title Plugins for the ERC20RewardPool that want to check the amount of rewards deposited in the contract
/// @title must implement this interface
interface IERC20RewardPool {
    /// @notice return the amount of rewards deposited in the contract that can be distributed by different campaigns
    /// @return the total amount of deposited rewards
    /// @dev this function can be called by a reward calculator to throw if a campaign doesn't have
    /// @dev enough rewards to start
    function getRewardsAvailable() external view returns (uint256);
}
