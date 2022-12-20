//SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import {Math} from "@openzeppelin/contracts-0.8/utils/math/Math.sol";
import {AccessControl} from "@openzeppelin/contracts-0.8/access/AccessControl.sol";
import {IRewardCalculator} from "../interfaces/IRewardCalculator.sol";

/// @notice This contract has two periods and two corresponding rates and durations. After an initial call
/// that sets the first period duration and rate another call can be done to set the duration and rate
/// for the next period. When the first period finishes, the next period becomes the current one, and
/// then the parameters for the future next period can be set again. This way the rate for the next
/// period can be set at any moment.
contract TwoPeriodsRewardCalculatorV2 is IRewardCalculator, AccessControl {
    event InitialCampaign(
        uint256 reward,
        uint256 duration,
        uint256 finish1,
        uint256 rate1,
        uint256 finish2,
        uint256 rate2
    );
    event NextCampaign(
        uint256 reward,
        uint256 duration,
        uint256 finish1,
        uint256 rate1,
        uint256 finish2,
        uint256 rate2
    );
    event UpdateCampaign(
        uint256 reward,
        uint256 duration,
        uint256 finish1,
        uint256 rate1,
        uint256 finish2,
        uint256 rate2
    );

    event SavedRewardsSet(uint256 indexed reward);

    // This role is in charge of configuring reward distribution
    bytes32 public constant REWARD_DISTRIBUTION = keccak256("REWARD_DISTRIBUTION");
    // Each time a parameter that affects the reward distribution is changed the rewards are distributed by the reward
    // pool contract this is the restart time.
    uint256 public lastUpdateTime;
    // This variable is only used when a new campaign starts (notifyRewardAmount is called)
    // We need to save the rewards accumulated between the last call to restartRewards and the call to notifyRewardAmount
    uint256 public savedRewards;
    // The reward distribution is divided in two periods with two different rated
    //                   |            |            |************|*
    //                   |            |          **|            |*
    //                   |            |        **  |            |*
    //                   |            |      **    |            |*
    //                   |            |    **      |            |*
    //                   |            |  **        |            |*
    //                   |            |**          |            |*
    //                   |        ****|            |            |*
    //                   |    ****    |            |            |*
    //                   |****        |            |            |*
    // zero -> **********|            |            |            |********************
    //                   |<-period1-> |<-period2-> |<-restart-> |
    uint256 public finish1;
    uint256 public rate1;
    uint256 public finish2;
    uint256 public rate2;

    // The address of the reward pool, the only one authorized to restart rewards
    address public immutable rewardPool;

    constructor(address rewardPool_) {
        rewardPool = rewardPool_;
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    /// @notice For the UI
    function getRate() external view returns (uint256) {
        if (isCampaignFinished()) {
            return 0;
        } else if (block.timestamp >= finish1) {
            return rate2;
        } else {
            return rate1;
        }
    }

    /// @notice For the UI
    function getFinish() external view returns (uint256) {
        if (isCampaignFinished()) {
            return 0;
        } else if (block.timestamp >= finish1) {
            return finish2;
        } else {
            return finish1;
        }
    }

    /// @notice At any point in time this function must return the accumulated rewards from last call to restartRewards
    function getRewards() external view override returns (uint256) {
        return savedRewards + _getRewards();
    }

    /// @notice The main contract has distributed the rewards until this point, this must start from scratch => getRewards() == 0
    function restartRewards() external override {
        require(msg.sender == rewardPool, "not reward pool");
        lastUpdateTime = block.timestamp;
        savedRewards = 0;
    }

    /// @notice Useful when switching reward calculators to set an initial reward.
    function setSavedRewards(uint256 reward) external {
        require(hasRole(REWARD_DISTRIBUTION, _msgSender()), "not reward distribution");
        savedRewards = reward;
        lastUpdateTime = block.timestamp;

        emit SavedRewardsSet(reward);
    }

    /// @notice This is a helper function, it is better to call setInitialCampaign or updateNextCampaign directly
    function runCampaign(uint256 reward, uint256 duration) external {
        require(hasRole(REWARD_DISTRIBUTION, _msgSender()), "not reward distribution");
        if (block.timestamp >= finish2) {
            _initialCampaign(reward, duration);
        } else {
            _updateNextCampaign(reward, duration);
        }
    }

    /// @notice Start an initial campaign, set the period1 of reward distribution, period2 rate is zero
    function setInitialCampaign(uint256 reward, uint256 duration) external {
        require(hasRole(REWARD_DISTRIBUTION, _msgSender()), "not reward distribution");
        require(block.timestamp >= finish2, "initial campaign running");
        _initialCampaign(reward, duration);
    }

    /// @notice Update the period2 of rate distribution, must be called after an initial campaign is set
    /// If period1 is running, period2 is set with the rate reward/duration.
    /// If period1 is finished it is updated with the values of period2 and period2 is set with the rate reward/duration.
    function updateNextCampaign(uint256 reward, uint256 duration) external {
        require(hasRole(REWARD_DISTRIBUTION, _msgSender()), "not reward distribution");
        require(block.timestamp < finish2, "initial campaign not running");
        _updateNextCampaign(reward, duration);
    }

    /// @notice Update the period1 (current campaign) of rate distribution, must be called after an initial campaign is set
    function updateCurrentCampaign(uint256 reward, uint256 duration) external {
        require(hasRole(REWARD_DISTRIBUTION, _msgSender()), "not reward distribution");
        require(block.timestamp < finish2, "initial campaign not running");
        _updateCurrentCampaign(reward, duration);
    }

    // Check if both periods already ended => campaign is finished
    function isCampaignFinished() public view returns (bool) {
        return (block.timestamp >= finish2);
    }

    /// @notice Check if some of the periods are still running
    function isCampaignRunning() external view returns (bool) {
        return (block.timestamp < finish2);
    }

    function _initialCampaign(uint256 reward, uint256 duration) internal {
        // block.timestamp >= finish2
        _saveRewards();
        finish1 = block.timestamp + duration;
        rate1 = reward / duration;
        finish2 = block.timestamp + duration;
        rate2 = 0;
        emit InitialCampaign(reward, duration, finish1, rate1, finish2, rate2);
    }

    function _updateNextCampaign(uint256 reward, uint256 duration) internal {
        // block.timestamp < finish2
        _saveRewards();
        if (block.timestamp >= finish1) {
            // The next campaign is new.
            finish1 = finish2;
            rate1 = rate2;
        }
        finish2 = finish1 + duration;
        rate2 = reward / duration;
        emit NextCampaign(reward, duration, finish1, rate1, finish2, rate2);
    }

    // TODO: we need to check the logic for this one, what to do with the remainder rewards and the next campaign duration ?
    // TODO: Right now we restart the current campaign forgetting the old values and leaving next one untouched.
    function _updateCurrentCampaign(uint256 reward, uint256 duration) internal {
        _saveRewards();
        if (block.timestamp >= finish1) {
            // The next campaign is new.
            finish1 = finish2;
            rate1 = rate2;
            rate2 = 0;
        }
        assert(finish1 <= finish2);
        uint256 duration2 = finish2 - finish1;
        finish1 = block.timestamp + duration;
        finish2 = finish1 + duration2;
        rate1 = reward / duration;
        emit UpdateCampaign(reward, duration, finish1, rate1, finish2, rate2);
    }

    function _saveRewards() internal {
        savedRewards = savedRewards + _getRewards();
        lastUpdateTime = block.timestamp;
    }

    function _getRewards() internal view returns (uint256) {
        assert(lastUpdateTime <= block.timestamp);
        assert(finish1 <= finish2);
        if (lastUpdateTime >= finish2) {
            return 0;
        }
        if (block.timestamp <= finish1) {
            return (block.timestamp - lastUpdateTime) * rate1;
        }
        // block.timestamp > finish1
        uint256 rewards2 = (Math.min(block.timestamp, finish2) - Math.max(lastUpdateTime, finish1)) * rate2;
        if (lastUpdateTime < finish1) {
            // add reward1 + reward2
            return (finish1 - lastUpdateTime) * rate1 + rewards2;
        }
        return rewards2;
    }
}
