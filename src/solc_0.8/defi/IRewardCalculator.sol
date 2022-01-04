//SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

interface IRewardCalculator {
    // At any point in time this function must return the accumulated rewards from last call to restartRewards
    function getRewards() external view returns (uint256);

    // The main contract has distributed the rewards (getRewards()) until this point, this must start
    // from scratch => getRewards() == 0
    function restartRewards(uint256 totalContributions) external;
}
