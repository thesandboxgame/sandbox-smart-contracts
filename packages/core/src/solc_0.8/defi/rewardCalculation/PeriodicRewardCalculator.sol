//SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import {Math} from "@openzeppelin/contracts-0.8/utils/math/Math.sol";
import {AccessControl} from "@openzeppelin/contracts-0.8/access/AccessControl.sol";
import {IRewardCalculator} from "../interfaces/IRewardCalculator.sol";

/*
    This contract calculate rewards linearly from the call to notifyRewardAmount until periodFinish
    if restartRewards is called in the middle with a nonzero contribution rewards are
    restarted (the main contract distribute the rewards at that point in time before calling)
    at the end of the period all the accumulated rewards (including those when restartRewards was called) are given.
*/
contract PeriodicRewardCalculator is IRewardCalculator, AccessControl {
    event RewardAdded(uint256 reward);

    // This role is in charge of configuring reward distribution
    bytes32 public constant REWARD_DISTRIBUTION = keccak256("REWARD_DISTRIBUTION");
    // Each time a parameter that affects the reward distribution is changed the rewards are distributed by the reward
    // pool contract this is the restart time.
    uint256 public lastUpdateTime;
    // This is the end of the period in which rewards are distributed
    uint256 public periodFinish;
    // Rewards are distributed at a fixed rate => reward = rewardRate * time
    uint256 public rewardRate;
    // The duration of the distribution period
    uint256 public duration;
    // This variable is only used when a new campaign starts (notifyRewardAmount is called)
    // We need to save the rewards accumulated between the last call to restartRewards and the call to notifyRewardAmount
    uint256 public savedRewards;
    // The address of the reward pool, the only one authorized to restart rewards
    address public immutable rewardPool;

    constructor(address rewardPool_, uint256 duration_) {
        rewardPool = rewardPool_;
        duration = duration_;
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function setDuration(uint256 newDuration) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "PeriodicRewardCalculator: not admin");
        require(block.timestamp >= periodFinish, "PeriodicRewardCalculator: campaign already started");

        duration = newDuration;
    }

    // At any point in time this function must return the accumulated rewards from last call to restartRewards
    function getRewards() external view override returns (uint256) {
        return savedRewards + _getRewards();
    }

    // The main contract has distributed the rewards until this point, this must start from scratch => getRewards() == 0
    function restartRewards() external override {
        require(msg.sender == rewardPool, "PeriodicRewardCalculator: not reward pool");
        // ensure reward past the first stacker do not get lost
        lastUpdateTime = _lastTimeRewardApplicable();
        savedRewards = 0;
    }

    // Useful when switching reward calculators to set an initial reward.
    function setSavedRewards(uint256 reward) external {
        require(hasRole(REWARD_DISTRIBUTION, _msgSender()), "PeriodicRewardCalculator: not reward distribution");
        savedRewards = reward;
        lastUpdateTime = block.timestamp;
    }

    function lastTimeRewardApplicable() external view returns (uint256) {
        return _lastTimeRewardApplicable();
    }

    ///@notice to be called after the amount of reward tokens (specified by the reward parameter) has been sent to the contract
    // Note that the reward should be divisible by the duration to avoid reward token lost
    // When calling this function with remaining>0 then reward + leftover must be divisible by duration (which can be problematic)
    ///@param reward number of token to be distributed over the duration
    function notifyRewardAmount(uint256 reward) external {
        require(hasRole(REWARD_DISTRIBUTION, _msgSender()), "PeriodicRewardCalculator: not reward distribution");
        savedRewards = _getRewards();
        lastUpdateTime = block.timestamp;
        if (block.timestamp >= periodFinish) {
            rewardRate = reward / duration;
        } else {
            uint256 remaining = periodFinish - block.timestamp;
            uint256 leftover = remaining * rewardRate;
            rewardRate = (reward + leftover) / duration;
        }
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
