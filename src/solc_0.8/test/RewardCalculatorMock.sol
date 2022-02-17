//SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import "../defi/interfaces/IRewardCalculator.sol";

contract RewardCalculatorMock is IRewardCalculator {
    event RewardRestarted();

    uint256 public reward;
    bool public skipRestart;

    // At any point in time this function must return the accumulated rewards from last call to restartRewards
    function getRewards() external view override returns (uint256) {
        return reward;
    }

    function restartRewards() external override {
        if (!skipRestart) {
            reward = 0;
        }
        emit RewardRestarted();
    }

    function setReward(uint256 reward_) external {
        reward = reward_;
    }

    function setSkipRestart(bool val) external {
        skipRestart = val;
    }
}
