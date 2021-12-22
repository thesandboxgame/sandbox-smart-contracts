//SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

interface IRewardCalculator {
    function getRewards() external view returns (uint256);

    function updateRewards(uint256 totalContributions) external;
}
