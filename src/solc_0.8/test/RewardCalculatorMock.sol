//SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import "hardhat/console.sol";
import "../defi/IRewardCalculator.sol";

contract RewardCalculatorMock is IRewardCalculator {
    event RewardRestarted(uint256 totalContributions);

    uint256 public reward;
    bool public skipRestart;
    bool public skipContribCheck;

    // At any point in time this function must return the accumulated rewards from last call to restartRewards
    function getRewards() external view override returns (uint256) {
        return reward;
    }

    function restartRewards(uint256 totalContributions) external override {
        console.log("restartRewards totalContributions", totalContributions);
        // TODO: totalContributions != 0 ???
        if (!skipRestart && (skipContribCheck || (!skipContribCheck && totalContributions != 0))) {
            reward = 0;
        }
        emit RewardRestarted(totalContributions);
    }

    function setReward(uint256 reward_) external {
        reward = reward_;
    }

    function setSkipRestart(bool val) external {
        skipRestart = val;
    }

    function setSkipContribCheck(bool val) external {
        skipContribCheck = val;
    }
}
