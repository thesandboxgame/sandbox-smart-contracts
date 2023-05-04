//SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

/// @title Plugins for Reward Pools that calculate the rewards must implement this interface
interface IRewardCalculator {
    /// @dev At any point in time this function must return the accumulated rewards from the last call to restartRewards
    function getRewards() external view returns (uint256);

    /// @dev The main contract has distributed the rewards (getRewards()) until this point, this must start
    /// @dev from scratch => getRewards() == 0
    function restartRewards() external;
}
