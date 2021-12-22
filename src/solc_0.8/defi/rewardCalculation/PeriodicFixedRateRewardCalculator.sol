//SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import {Math} from "@openzeppelin/contracts-0.8/utils/math/Math.sol";
import {AccessControl} from "@openzeppelin/contracts-0.8/access/AccessControl.sol";
import {IRewardCalculator} from "../IRewardCalculator.sol";

contract PeriodicFixedRateRewardCalculator is IRewardCalculator, AccessControl {
    event RewardAdded(uint256 reward);

    bytes32 public constant REWARD_DISTRIBUTION = keccak256("REWARD_DISTRIBUTION");
    // Each time a parameter that affects the reward is changed the reward until that point are updated.
    uint256 public lastUpdateTime;
    uint256 public periodFinish = 0;
    uint256 public rewardRate = 0;
    address public rewardPool;
    uint256 public duration;

    constructor(address rewardPool_, uint256 duration_) {
        rewardPool = rewardPool_;
        duration = duration_;
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    // At any point in time this function must return the accumulated rewards from last call to updateRewards
    function getRewards() external view override returns (uint256) {
        return (_lastTimeRewardApplicable() - lastUpdateTime) * rewardRate;
    }

    function updateRewards(uint256 totalContributions) external override {
        require(msg.sender == rewardPool, "not reward pool");
        if (block.timestamp >= periodFinish || totalContributions != 0) {
            // ensure reward past the first staker do not get lost
            lastUpdateTime = _lastTimeRewardApplicable();
        }
    }

    function lastTimeRewardApplicable() external view returns (uint256) {
        return _lastTimeRewardApplicable();
    }

    ///@notice to be called after the amount of reward tokens (specified by the reward parameter) has been sent to the contract
    // Note that the reward should be divisible by the duration to avoid reward token lost
    ///@param reward number of token to be distributed over the duration
    function notifyRewardAmount(uint256 reward) external {
        require(hasRole(REWARD_DISTRIBUTION, _msgSender()), "not reward distribution");
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

    function _lastTimeRewardApplicable() internal view returns (uint256) {
        return Math.min(block.timestamp, periodFinish);
    }
}
