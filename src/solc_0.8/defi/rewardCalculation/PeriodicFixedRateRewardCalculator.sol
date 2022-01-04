//SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import {Math} from "@openzeppelin/contracts-0.8/utils/math/Math.sol";
import {AccessControl} from "@openzeppelin/contracts-0.8/access/AccessControl.sol";
import {IRewardCalculator} from "../IRewardCalculator.sol";

/*
    This contract calculate rewards linearly from the call to notifyRewardAmount until periodFinish
    if restartRewards is called in the middle with a nonzero contribution rewards are
    restarted (the main contract distribute the rewards at that point in time before calling)
    at the end of the period all the accumulated rewards (including those when restartRewards was called) are given.
*/
contract PeriodicFixedRateRewardCalculator is IRewardCalculator, AccessControl {
    event RewardAdded(uint256 reward);

    bytes32 public constant REWARD_DISTRIBUTION = keccak256("REWARD_DISTRIBUTION");
    // Each time a parameter that affects the reward distribution is changed the rewards are distributed by the main
    // this contract must restart the distribution from zero.
    uint256 public lastUpdateTime;
    // This is de end of the period in which rewards are distributed
    uint256 public periodFinish;
    // calculated rate => reward = rewardRate * time
    uint256 public rewardRate;
    // The duration of the distribution period
    uint256 public duration;
    // This variable is only used when a new campaign starts (notifyRewardAmount is called)
    // We need to save the rewards accumulated between the last call to restartRewards and the call to notifyRewardAmount
    uint256 public savedRewards;

    address public rewardPool;

    constructor(address rewardPool_, uint256 duration_) {
        rewardPool = rewardPool_;
        duration = duration_;
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    // At any point in time this function must return the accumulated rewards from last call to restartRewards
    function getRewards() external view override returns (uint256) {
        return savedRewards + _getRewards();
    }

    // The main contract has distributed the rewards until this point, this must start from scratch => getRewards() == 0
    function restartRewards(uint256 totalContributions) external override {
        require(msg.sender == rewardPool, "not reward pool");
        if (block.timestamp >= periodFinish || totalContributions != 0) {
            // ensure reward past the first stacker do not get lost
            lastUpdateTime = _lastTimeRewardApplicable();
            savedRewards = 0;
        }
    }

    function lastTimeRewardApplicable() external view returns (uint256) {
        return _lastTimeRewardApplicable();
    }

    ///@notice to be called after the amount of reward tokens (specified by the reward parameter) has been sent to the contract
    // Note that the reward should be divisible by the duration to avoid reward token lost
    // When calling this function with remaining>0 then reward + leftover must be divisible by duration (which can be problematic)
    ///@param reward number of token to be distributed over the duration
    function notifyRewardAmount(uint256 reward) external {
        require(hasRole(REWARD_DISTRIBUTION, _msgSender()), "not reward distribution");
        savedRewards = _getRewards();
        if (block.timestamp >= periodFinish) {
            rewardRate = reward / duration;
        } else {
            uint256 remaining = periodFinish - block.timestamp;
            uint256 leftover = remaining * rewardRate;
            rewardRate = (reward + leftover) / duration;
        }
        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp + duration;
        emit RewardAdded(reward);
    }

    function _getRewards() internal view returns (uint256) {
        return (_lastTimeRewardApplicable() - lastUpdateTime) * rewardRate;
    }

    function _lastTimeRewardApplicable() internal view returns (uint256) {
        return Math.min(block.timestamp, periodFinish);
    }
}
