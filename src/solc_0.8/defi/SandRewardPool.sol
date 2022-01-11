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

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event ContributionUpdated(address indexed user, uint256 newContribution, uint256 contribution);

    uint256 public rewardPerTokenStored;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    IERC20 public rewardToken;
    IContributionCalculator public contributionCalculator;
    IRewardCalculator public rewardCalculator;

    uint256 internal _totalContributions;
    mapping(address => uint256) internal _contributions;

    constructor(
        IERC20 stakeToken_,
        IERC20 rewardToken_,
        address trustedForwarder
    ) StakeTokenWrapper(stakeToken_) {
        rewardToken = rewardToken_;
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        __ERC2771Handler_initialize(trustedForwarder);
    }

    modifier isContractAndAdmin(address contractAddress) {
        require(contractAddress.isContract(), "not a contract");
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "not admin");
        _;
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
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "Only admin");
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

    // TODO: Check if is ok to remove the admin restriction (everybody can call it).
    function restartRewards() external {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "not admin");
        _restartRewards();
    }

    // TODO: Do we want this one ? This is risky, the admin can steal users funds.
    // TODO: the admin can set any value into rewardToken, for example rewardToken = _stakeToken ?
    // TODO: without it some funds can be locked inside the contract (as we use rates for calculation).
    // TODO: The admin can still use a contribution calculator that give him all the funds + a reward calculator that
    // TODO: give him the rewards...
    function recoverFunds(address receiver) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "not admin");
        rewardToken.safeTransfer(receiver, rewardToken.balanceOf(address(this)));
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

    // Backward compatibility
    function rewardPerToken() external view returns (uint256) {
        return rewardPerTokenStored + _rewardPerToken();
    }

    function earned(address account) external view returns (uint256) {
        return rewards[account] + _earned(account);
    }

    function computeContribution(address account) external {
        require(account != address(0), "invalid address");
        // We decide to give the user the accumulated rewards even if he cheated a little bit.
        _processRewards(account);
        _updateContribution(account);
    }

    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Cannot stake 0");
        _processRewards(_msgSender());
        super._stake(amount);
        _updateContribution(_msgSender());
        emit Staked(_msgSender(), amount);
    }

    function withdraw(uint256 amount) external nonReentrant {
        _processRewards(_msgSender());
        _withdrawStake(amount);
    }

    function exit() external nonReentrant {
        _processRewards(_msgSender());
        _withdrawStake(_balances[_msgSender()]);
        _withdrawRewards();
    }

    // TODO: Rename ?
    function getReward() external nonReentrant {
        _processRewards(_msgSender());
        _withdrawRewards();
    }

    function getDuration() external returns (uint256) {
        return duration;
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
        // Update the earnings for this specific user with what he earned until now
        rewards[account] = rewards[account] + _earned(account);
        // restart rewards for this specific user, now earned(account) = 0
        userRewardPerTokenPaid[account] = rewardPerTokenStored;
    }

    function _restartRewards() internal {
        // OBS: For the first deposit _totalContributions == 0 => _rewardPerToken return zero and we don't want to
        // reinitialize rewards (so they are not lost).
        // The original contract ignore rewards for campaigns in which there where no deposits, aka
        // totalContributions == 0 during all the campaign.
        // The original code is: `if (block.timestamp >= periodFinish || _totalContributions != 0)`
        // our new code distribute the rewards even after the campaign ends.
        // TODO: Review this part, see (line 99): https://github.com/thesandboxgame/sandbox-smart-contracts/blame/176b862302b5fe4b02f673872ef852007474d024/src/LiquidityMining/LandWeightedSANDRewardPool.sol
        // Distribute the accumulated rewards
        rewardPerTokenStored = rewardPerTokenStored + _rewardPerToken();
        // restart rewards so now the rewardCalculator return zero rewards
        rewardCalculator.restartRewards(_totalContributions);
    }

    function _earned(address account) internal view returns (uint256) {
        return
            ((_rewardPerToken() + rewardPerTokenStored - userRewardPerTokenPaid[account]) * _contributions[account]) /
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
