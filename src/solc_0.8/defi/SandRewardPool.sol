//SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import {SafeERC20} from "@openzeppelin/contracts-0.8/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts-0.8/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts-0.8/access/Ownable.sol";
import {Math} from "@openzeppelin/contracts-0.8/utils/math/Math.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts-0.8/security/ReentrancyGuard.sol";
import {Address} from "@openzeppelin/contracts-0.8/utils/Address.sol";
import {AccessControl} from "@openzeppelin/contracts-0.8/access/AccessControl.sol";
import {IERC721} from "@openzeppelin/contracts-0.8/token/ERC721/IERC721.sol";
import {StakeTokenWrapper} from "./StakeTokenWrapper.sol";
import {SafeMathWithRequire} from "../common/Libraries/SafeMathWithRequire.sol";
import {IContributionCalculator} from "./IContributionCalculator.sol";

contract SandRewardPool is StakeTokenWrapper, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Address for address;

    event RewardAdded(uint256 reward);
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event ContributionUpdated(address indexed user, uint256 newContribution, uint256 contribution);

    bytes32 public constant REWARD_DISTRIBUTION = keccak256("REWARD_DISTRIBUTION");

    uint256 public immutable duration;

    uint256 public periodFinish = 0;
    uint256 public rewardRate = 0;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    IERC20 public rewardToken;
    IContributionCalculator public contributionCalculator;

    uint256 internal _totalContributions;
    mapping(address => uint256) internal _contributions;

    constructor(
        IERC20 stakeToken_,
        IERC20 rewardToken_,
        IContributionCalculator contributionCalculator_,
        uint256 rewardDuration_
    ) StakeTokenWrapper(stakeToken_) {
        rewardToken = rewardToken_;
        contributionCalculator = contributionCalculator_;
        duration = rewardDuration_;
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function setRewardToken(address newRewardToken) external {
        require(newRewardToken.isContract(), "Bad RewardToken address");
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "not admin");
        rewardToken = IERC20(newRewardToken);
    }

    function setStakeToken(address newStakeLPToken) external {
        require(newStakeLPToken.isContract(), "Bad StakeToken address");
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "not admin");
        _stakeToken = IERC20(newStakeLPToken);
    }

    // ToDo: check if no campaign is running
    function setDuration(uint256 newDuration) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "not admin");
        duration = newDuration
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function totalContributions() external view returns (uint256) {
        return _totalContributions;
    }

    function contributionOf(address account) external view returns (uint256) {
        return _contributions[account];
    }

    function lastTimeRewardApplicable() public view returns (uint256) {
        return Math.min(block.timestamp, periodFinish);
    }

    function rewardPerToken() public view returns (uint256) {
        if (_totalContributions == 0) {
            return rewardPerTokenStored;
        }
        return
            rewardPerTokenStored +
            ((lastTimeRewardApplicable() - lastUpdateTime) * rewardRate * 1e24) /
            _totalContributions;
    }

    function earned(address account) public view returns (uint256) {
        return
            rewards[account] + ((rewardPerToken() - userRewardPerTokenPaid[account]) * _contributions[account]) / 1e24;
    }

    function computeMultiplier(address account) external {
        _processReward();
        _processUserReward(account);
        _updateContribution(account);
    }

    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Cannot stake 0");
        _processReward();
        _processUserReward(_msgSender());
        super._stake(amount);
        _updateContribution(_msgSender());
        emit Staked(_msgSender(), amount);
    }

    function withdraw(uint256 amount) public nonReentrant {
        _processReward();
        _processUserReward(_msgSender());
        _withdrawStake(amount);
    }

    function exit() external {
        _processReward();
        _processUserReward(_msgSender());
        _withdrawStake(_balances[_msgSender()]);
        _withdrawRewards();
    }

    function getReward() public nonReentrant {
        _processReward();
        _processUserReward(_msgSender());
        _withdrawRewards();
    }

    function getDuration() external returns (uint256) {
        return duration;
    }

    ///@notice to be called after the amount of reward tokens (specified by the reward parameter) has been sent to the contract
    // Note that the reward should be divisible by the duration to avoid reward token lost
    ///@param reward number of token to be distributed over the duration
    function notifyRewardAmount(uint256 reward) external {
        require(hasRole(REWARD_DISTRIBUTION, _msgSender()), "not reward distribution");
        _processReward();
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

    function _updateContribution(address account) internal {
        uint256 oldContribution = _contributions[account];
        _totalContributions = _totalContributions - oldContribution;
        uint256 contribution = contributionCalculator.computeContribution(account, _balances[account]);
        _totalContributions = _totalContributions + contribution;
        _contributions[account] = contribution;
        emit ContributionUpdated(account, contribution, oldContribution);
    }

    function _withdrawStake(uint256 amount) internal {
        require(amount > 0, "Cannot withdraw 0");
        super._withdraw(amount);
        _updateContribution(_msgSender());
        emit Withdrawn(_msgSender(), amount);
    }

    function _withdrawRewards() internal {
        uint256 reward = rewards[_msgSender()];
        if (reward > 0) {
            rewards[_msgSender()] = 0;
            rewardToken.safeTransfer(_msgSender(), reward);
            emit RewardPaid(_msgSender(), reward);
        }
    }

    function _processReward() internal {
        rewardPerTokenStored = rewardPerToken();
        if (block.timestamp >= periodFinish || _totalContributions != 0) {
            // ensure reward past the first staker do not get lost
            lastUpdateTime = lastTimeRewardApplicable();
        }
    }

    function _processUserReward(address account) internal {
        rewards[account] = earned(account);
        userRewardPerTokenPaid[account] = rewardPerTokenStored;
    }
}
