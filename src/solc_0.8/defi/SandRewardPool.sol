//SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import {Context} from "@openzeppelin/contracts-0.8/utils/Context.sol";
import {SafeERC20} from "@openzeppelin/contracts-0.8/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts-0.8/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts-0.8/security/ReentrancyGuard.sol";
import {Address} from "@openzeppelin/contracts-0.8/utils/Address.sol";
import {AccessControl} from "@openzeppelin/contracts-0.8/access/AccessControl.sol";
import {ERC2771Handler} from "../common/BaseWithStorage/ERC2771Handler.sol";
import {StakeTokenWrapper} from "./StakeTokenWrapper.sol";
import {IContributionCalculator} from "./IContributionCalculator.sol";
import {IRewardCalculator} from "./IRewardCalculator.sol";

/// @title A pool that distributes rewards between users that stake sand (or any erc20 token)
/// @dev The contributions are updated passively, an external call to computeContribution is needed.
/// @dev default behaviour (address(0)) for contributionCalculator is to use the stacked amount as contribution
/// @dev default behaviour (address(0)) for rewardCalculator is to stop giving rewards
contract SandRewardPool is StakeTokenWrapper, AccessControl, ReentrancyGuard, ERC2771Handler {
    using SafeERC20 for IERC20;
    using Address for address;

    event Staked(address indexed account, uint256 stakeAmount);
    event Withdrawn(address indexed account, uint256 stakeAmount);
    event Exit(address indexed account);
    event RewardPaid(address indexed account, uint256 rewardAmount);
    event ContributionUpdated(address indexed account, uint256 newContribution, uint256 oldContribution);

    uint256 public rewardPerTokenStored;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    IERC20 public rewardToken;
    IContributionCalculator public contributionCalculator;
    IRewardCalculator public rewardCalculator;

    uint256 internal _totalContributions;
    mapping(address => uint256) internal _contributions;

    struct AntiCompound {
        uint256 lockPeriodInSecs;
        mapping(address => uint256) lastWithdraw;
    }

    AntiCompound public antiCompound;

    constructor(
        IERC20 stakeToken_,
        IERC20 rewardToken_,
        address trustedForwarder
    ) StakeTokenWrapper(stakeToken_) {
        rewardToken = rewardToken_;
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        __ERC2771Handler_initialize(trustedForwarder);
    }

    modifier antiCompoundCheck(address account) {
        require(
            block.timestamp > antiCompound.lastWithdraw[account] + antiCompound.lockPeriodInSecs,
            "SandRewardPool: must wait"
        );
        antiCompound.lastWithdraw[account] = block.timestamp;
        _;
    }

    modifier isContractAndAdmin(address contractAddress) {
        require(contractAddress.isContract(), "SandRewardPool: not a contract");
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "SandRewardPool: not admin");
        _;
    }

    function setAntiCompoundLockPeriod(uint256 lockPeriodInSecs) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "SandRewardPool: not admin");
        antiCompound.lockPeriodInSecs = lockPeriodInSecs;
    }

    function setContributionCalculator(address contractAddress) external isContractAndAdmin(contractAddress) {
        contributionCalculator = IContributionCalculator(contractAddress);
    }

    function setRewardToken(address contractAddress) external isContractAndAdmin(contractAddress) {
        rewardToken = IERC20(contractAddress);
    }

    function setStakeToken(address contractAddress) external isContractAndAdmin(contractAddress) {
        _stakeToken = IERC20(contractAddress);
    }

    function setTrustedForwarder(address trustedForwarder) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "SandRewardPool: not admins");
        _trustedForwarder = trustedForwarder;
    }

    function setRewardCalculator(address contractAddress, bool restartRewards)
        external
        isContractAndAdmin(contractAddress)
    {
        // We process the rewards of the current reward calculator before the switch.
        if (restartRewards) {
            _restartRewards();
        }
        rewardCalculator = IRewardCalculator(contractAddress);
    }

    function recoverFunds(address receiver) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "SandRewardPool: not admin");
        rewardToken.safeTransfer(receiver, rewardToken.balanceOf(address(this)));
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

    function rewardPerToken() external view returns (uint256) {
        return rewardPerTokenStored + _rewardPerToken();
    }

    function earned(address account) external view returns (uint256) {
        return rewards[account] + _earned(account, _rewardPerToken());
    }

    function restartRewards() external {
        _restartRewards();
    }

    function computeContribution(address account) external {
        require(account != address(0), "SandRewardPool: invalid address");
        // We decide to give the user the accumulated rewards even if he cheated a little bit.
        _processRewards(account);
        _updateContribution(account);
    }

    function computeContributionInBatch(address[] calldata accounts) external {
        _restartRewards();
        uint256 rewardPerToken = _rewardPerToken();
        for (uint256 i = 0; i < accounts.length; i++) {
            address account = accounts[i];
            if (account != address(0)) {
                continue;
            }
            _processAccountRewards(account, rewardPerToken);
            _updateContribution(account);
        }
    }

    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "SandRewardPool: Cannot stake 0");

        uint256 earlierRewards;
        if (_totalContributions == 0) {
            earlierRewards = rewardCalculator.getRewards();
        }

        _processRewards(_msgSender());
        super._stake(amount);
        _updateContribution(_msgSender());

        if (earlierRewards != 0) {
            rewards[_msgSender()] = rewards[_msgSender()] + earlierRewards;
        }
        emit Staked(_msgSender(), amount);
    }

    function withdraw(uint256 amount) external nonReentrant {
        _processRewards(_msgSender());
        _withdrawStake(_msgSender(), amount);
        _updateContribution(_msgSender());
    }

    function exit() external nonReentrant {
        _processRewards(_msgSender());
        _withdrawStake(_msgSender(), _balances[_msgSender()]);
        _withdrawRewards(_msgSender());
        _updateContribution(_msgSender());
        emit Exit(_msgSender());
    }

    function getReward() external nonReentrant {
        _processRewards(_msgSender());
        _withdrawRewards(_msgSender());
        _updateContribution(_msgSender());
    }

    function _withdrawStake(address account, uint256 amount) internal {
        require(amount > 0, "SandRewardPool: Cannot withdraw 0");
        super._withdraw(amount);
        _updateContribution(account);
        emit Withdrawn(account, amount);
    }

    function _withdrawRewards(address account) internal antiCompoundCheck(account) {
        uint256 reward = rewards[account];
        if (reward > 0) {
            rewards[account] = 0;
            rewardToken.safeTransfer(account, reward);
            emit RewardPaid(account, reward);
        }
    }

    function _updateContribution(address account) internal {
        uint256 oldContribution = _contributions[account];
        _totalContributions = _totalContributions - oldContribution;
        uint256 contribution = _computeContribution(account);
        _totalContributions = _totalContributions + contribution;
        _contributions[account] = contribution;
        emit ContributionUpdated(account, contribution, oldContribution);
    }

    function _computeContribution(address account) internal returns (uint256) {
        if (contributionCalculator == IContributionCalculator(address(0))) {
            return _balances[account];
        } else {
            return contributionCalculator.computeContribution(account, _balances[account]);
        }
    }

    // Something changed (stake, withdraw, etc), we distribute current accumulated rewards and start from zero.
    // Called each time there is a change in contract state (stake, withdraw, etc).
    function _processRewards(address account) internal {
        _restartRewards();
        _processAccountRewards(account, _rewardPerToken());
    }

    function _processAccountRewards(address account, uint256 rewardPerToken) internal {
        // Update the earnings for this specific user with what he earned until now
        rewards[account] = rewards[account] + _earned(account, rewardPerToken);
        // restart rewards for this specific user, now earned(account) = 0
        userRewardPerTokenPaid[account] = rewardPerTokenStored;
    }

    function _restartRewards() internal {
        // Distribute the accumulated rewards
        rewardPerTokenStored = rewardPerTokenStored + _rewardPerToken();
        // restart rewards so now the rewardCalculator return zero rewards
        rewardCalculator.restartRewards();
    }

    function _earned(address account, uint256 rewardPerToken) internal view returns (uint256) {
        // - userRewardPerTokenPaid[account] * _contributions[account]  / _totalContributions is the portion of
        //      rewards the last time the user changed his contribution and called _restartRewards
        //      (_totalContributions corresponds to previous value of that moment).
        // - rewardPerTokenStored * _contributions[account]  / _totalContributions is the share of the user from the
        //      accumulated rewards (from the start of time until the last call to _restartRewards) with the
        //      current value of _totalContributions
        // - _rewardPerToken() * _contributions[account]  / _totalContributions is the share of the user of the
        //      rewards from the last time anybody called _restartRewards until this moment
        //
        // The important thing to note is that at any moment in time _contributions[account] / _totalContributions is
        // the share of the user even if _totalContributions changes because of other users activity.
        return
            ((rewardPerToken + rewardPerTokenStored - userRewardPerTokenPaid[account]) * _contributions[account]) /
            1e24;
    }

    // This function gives the proportion of the total contribution that corresponds to each user from
    // last restartRewards call.
    // _rewardsPerToken() * _contributions[account] is the amount of extra rewards gained from last restartRewards.
    function _rewardPerToken() internal view returns (uint256) {
        if (rewardCalculator == IRewardCalculator(address(0)) || _totalContributions == 0) {
            return 0;
        }
        return (rewardCalculator.getRewards() * 1e24) / _totalContributions;
    }

    function _msgSender() internal view override(Context, ERC2771Handler) returns (address sender) {
        return ERC2771Handler._msgSender();
    }

    function _msgData() internal view override(Context, ERC2771Handler) returns (bytes calldata) {
        return ERC2771Handler._msgData();
    }
}
