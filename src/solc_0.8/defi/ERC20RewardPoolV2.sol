//SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import {Context} from "@openzeppelin/contracts-0.8/utils/Context.sol";
import {SafeERC20} from "@openzeppelin/contracts-0.8/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts-0.8/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts-0.8/security/ReentrancyGuard.sol";
import {Address} from "@openzeppelin/contracts-0.8/utils/Address.sol";
import {Pausable} from "@openzeppelin/contracts-0.8/security/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts-0.8/access/Ownable.sol";
import {Math} from "@openzeppelin/contracts-0.8/utils/math/Math.sol";
import {ERC2771HandlerV3} from "../common/BaseWithStorage/ERC2771HandlerV3.sol";
import {StakeTokenWrapperV2} from "./StakeTokenWrapperV2.sol";
import {IContributionRules} from "./interfaces/IContributionRules.sol";
import {IRewardCalculator} from "./interfaces/IRewardCalculator.sol";
import {LockRulesV2} from "./rules-v2/LockRulesV2.sol";
import {RequirementsRulesV2} from "./rules-v2/RequirementsRulesV2.sol";

/// @title A pool that distributes rewards between users that stake any erc20 token
/// @notice The contributions are updated passively, an external call to computeContribution from a backend is needed.
/// @notice After initialization the reward calculator must be set by the admin.
/// @dev The contract has two plugins that affect the behaviour: contributionCalculator and rewardCalculator
/// @dev contributionCalculator instead of using the stake directly the result of computeContribution is used
/// @dev this way some users can get an extra share of the rewards
/// @dev rewardCalculator is used to manage the rate at which the rewards are distributed.
/// @dev This way we can build different types of pools by mixing in the plugins we want with this contract.
/// @dev default behaviour (address(0)) for contributionCalculator is to use the stacked amount as contribution.
/// @dev default behaviour (address(0)) for rewardCalculator is that no rewards are given
contract ERC20RewardPoolV2 is
    Ownable,
    StakeTokenWrapperV2,
    LockRulesV2,
    RequirementsRulesV2,
    ReentrancyGuard,
    ERC2771HandlerV3,
    Pausable
{
    using SafeERC20 for IERC20;
    using Address for address;

    event RewardTokenSet(address indexed contractAddress);
    event StakeTokenSet(address indexed contractAddress);
    event TrustedForwarderSet(address indexed trustedForwarder);
    event ContributionRulesSet(address indexed contractAddress);
    event RewardCalculatorSet(address indexed contractAddress, bool restartRewards_);
    event FundsRecovered(address indexed receiver, uint256 recoverAmount);
    event Staked(address indexed account, uint256 stakeAmount);
    event Withdrawn(address indexed account, uint256 stakeAmount);
    event Exit(address indexed account);
    event RewardPaid(address indexed account, uint256 rewardAmount);
    event ContributionUpdated(address indexed account, uint256 newContribution, uint256 oldContribution);

    uint256 private constant DECIMALS_18 = 1 ether;

    // This value multiplied by the user contribution is the share of accumulated rewards (from the start of time
    // until the last call to restartRewards) for the user taking into account the value of totalContributions.
    uint256 public rewardPerTokenStored;

    IERC20 public rewardToken;
    IContributionRules public contributionRules;
    IRewardCalculator public rewardCalculator;

    // This value multiplied by the user contribution is the share of reward from the the last time
    // the user changed his contribution and called restartRewards
    mapping(address => uint256) public userRewardPerTokenPaid;

    // This value is the accumulated rewards won by the user when he called the contract.
    mapping(address => uint256) public rewards;

    uint256 internal _totalContributions;
    mapping(address => uint256) internal _contributions;

    constructor(
        IERC20 stakeToken_,
        IERC20 rewardToken_,
        address trustedForwarder
    ) StakeTokenWrapperV2(stakeToken_) {
        require(address(rewardToken_).isContract(), "ERC20RewardPool: is not a contract");
        rewardToken = rewardToken_;
        __ERC2771HandlerV3_initialize(trustedForwarder);
    }

    modifier isValidAddress(address account) {
        require(account != address(0), "ERC20RewardPool: zero address");

        _;
    }

    /// @notice set the reward token
    /// @param contractAddress address token used to pay rewards
    function setRewardToken(address contractAddress)
        external
        isContract(contractAddress)
        isValidAddress(contractAddress)
        onlyOwner
    {
        IERC20 _newRewardToken = IERC20(contractAddress);
        require(
            rewardToken.balanceOf(address(this)) <= _newRewardToken.balanceOf(address(this)),
            "ERC20RewardPool: insufficient balance"
        );
        rewardToken = _newRewardToken;

        emit RewardTokenSet(contractAddress);
    }

    /// @notice set the stake token
    /// @param contractAddress address token used to stake funds
    function setStakeToken(address contractAddress)
        external
        isContract(contractAddress)
        isValidAddress(contractAddress)
        onlyOwner
    {
        IERC20 _newStakeToken = IERC20(contractAddress);
        require(
            _stakeToken.balanceOf(address(this)) <= _newStakeToken.balanceOf(address(this)),
            "ERC20RewardPool: insufficient balance"
        );
        _stakeToken = _newStakeToken;

        emit StakeTokenSet(contractAddress);
    }

    /// @notice set the trusted forwarder
    /// @param trustedForwarder address of the contract that is enabled to send meta-tx on behalf of the user
    function setTrustedForwarder(address trustedForwarder) external isContract(trustedForwarder) onlyOwner {
        _trustedForwarder = trustedForwarder;

        emit TrustedForwarderSet(trustedForwarder);
    }

    /// @notice set contract that contains all the contribution rules
    function setContributionRules(address contractAddress)
        external
        isContract(contractAddress)
        isValidAddress(contractAddress)
        onlyOwner
    {
        contributionRules = IContributionRules(contractAddress);

        emit ContributionRulesSet(contractAddress);
    }

    /// @notice set the reward calculator
    /// @param contractAddress address of a plugin that calculates absolute rewards at any point in time
    /// @param restartRewards_ if true the rewards from the previous calculator are accumulated before changing it
    function setRewardCalculator(address contractAddress, bool restartRewards_)
        external
        isContract(contractAddress)
        isValidAddress(contractAddress)
        onlyOwner
    {
        // We process the rewards of the current reward calculator before the switch.
        if (restartRewards_) {
            _restartRewards();
        }
        rewardCalculator = IRewardCalculator(contractAddress);

        emit RewardCalculatorSet(contractAddress, restartRewards_);
    }

    /// @notice the admin recover is able to recover reward funds
    /// @param receiver address of the beneficiary of the recovered funds
    /// @dev this function must be called in an emergency situation only.
    /// @dev Calling it is risky specially when rewardToken == stakeToken
    function recoverFunds(address receiver) external onlyOwner whenPaused() isValidAddress(receiver) {
        uint256 recoverAmount;

        if (rewardToken == _stakeToken) {
            recoverAmount = rewardToken.balanceOf(address(this)) - _totalSupply;
        } else {
            recoverAmount = rewardToken.balanceOf(address(this));
        }

        rewardToken.safeTransfer(receiver, recoverAmount);

        emit FundsRecovered(receiver, recoverAmount);
    }

    /// @notice return the total supply of staked tokens
    /// @return the total supply of staked tokens
    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    /// @notice return the balance of staked tokens for a user
    /// @param account the address of the account
    /// @return balance of staked tokens
    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    /// @notice return the address of the stake token contract
    /// @return address of the stake token contract
    function stakeToken() external view returns (IERC20) {
        return _stakeToken;
    }

    /// @notice return the amount of rewards deposited in the contract that can be distributed by different campaigns
    /// @return the total amount of deposited rewards
    /// @dev this function can be called by a reward calculator to throw if a campaign doesn't have
    /// @dev enough rewards to start
    function getRewardsAvailable() public view returns (uint256) {
        if (address(rewardToken) != address(_stakeToken)) {
            return rewardToken.balanceOf(address(this));
        }
        return rewardToken.balanceOf(address(this)) - _totalSupply;
    }

    /// @notice return the sum of the values returned by the contribution calculator
    /// @return total contributions of the users
    /// @dev this is the same than the totalSupply only if the contribution calculator
    /// @dev uses the staked amount as the contribution of the user which is the default behaviour
    function totalContributions() external view returns (uint256) {
        return _totalContributions;
    }

    /// @notice return the contribution of some user
    /// @param account the address of the account
    /// @return contribution of the users
    /// @dev this is the same than the balanceOf only if the contribution calculator
    /// @dev uses the staked amount as the contribution of the user which is the default behaviour
    function contributionOf(address account) external view returns (uint256) {
        return _contributions[account];
    }

    /// @notice accumulated rewards taking into account the totalContribution (see: rewardPerTokenStored)
    /// @return the accumulated total rewards
    /// @dev This value multiplied by the user contribution is the share of accumulated rewards for the user. Taking
    /// @dev into account the value of totalContributions.
    function rewardPerToken() external view returns (uint256) {
        return rewardPerTokenStored + _rewardPerToken();
    }

    /// @notice available earnings for some user
    /// @param account the address of the account
    /// @return the available earnings for the user
    function earned(address account) external view returns (uint256) {
        return rewards[account] + _earned(account, _rewardPerToken());
    }

    /// @notice accumulates the current rewards into rewardPerTokenStored and restart the reward calculator
    /// @dev calling this function makes no difference. It is useful for testing and when the reward calculator
    /// @dev is changed.
    function restartRewards() external {
        _restartRewards();
    }

    /// @notice update the contribution for a user
    /// @param account the address of the account
    /// @dev if the user change his holdings (or any other parameter that affect the contribution calculation),
    /// @dev he can the reward distribution to his favor. This function must be called by an external agent ASAP to
    /// @dev update the contribution for the user. We understand the risk but the rewards are distributed slowly so
    /// @dev the user cannot affect the reward distribution heavily.
    function computeContribution(address account) external isValidAddress(account) {
        // We decide to give the user the accumulated rewards even if he cheated a little bit.
        _processRewards(account);
        _updateContribution(account);
    }

    /// @notice update the contribution for a sef of users
    /// @param accounts the addresses of the accounts to update
    /// @dev see: computeContribution
    function computeContributionInBatch(address[] calldata accounts) external {
        _restartRewards();
        for (uint256 i; i < accounts.length; ) {
            address account = accounts[i];
            if (account == address(0)) {
                continue;
            }
            _processAccountRewards(account);
            _updateContribution(account);

            unchecked {i++;}
        }
    }

    /// @notice stake some amount into the contract
    /// @param amount the amount of tokens to stake
    /// @dev the user must approve in the stake token before calling this function
    function stake(uint256 amount)
        external
        nonReentrant
        whenNotPaused()
        antiDepositCheck(_msgSender())
        checkRequirements(_msgSender(), amount, _balances[_msgSender()])
    {
        require(amount > 0, "ERC20RewardPool: Cannot stake 0");

        address _sender = _msgSender();

        // The first time a user stakes he cannot remove his rewards immediately.
        if (timeLockClaim.lastClaim[_sender] == 0) {
            timeLockClaim.lastClaim[_sender] = block.timestamp;
        }

        uint256 earlierRewards;

        if (_totalContributions == 0 && rewardCalculator != IRewardCalculator(address(0))) {
            earlierRewards = rewardCalculator.getRewards();
        }

        _processRewards(_sender);
        super._stake(amount);
        _updateContribution(_sender);
        require(_contributions[_sender] > 0, "ERC20RewardPool: not enough contributions");

        if (earlierRewards != 0) {
            rewards[_sender] = rewards[_sender] + earlierRewards;
        }
        emit Staked(_sender, amount);
    }

    /// @notice withdraw the stake from the contract
    /// @param amount the amount of tokens to withdraw
    /// @dev the user can withdraw his stake independently from the rewards
    function withdraw(uint256 amount) external nonReentrant whenNotPaused() {
        address _sender = _msgSender();

        _processRewards(_sender);
        _withdrawStake(_sender, amount);
        _updateContribution(_sender);
    }

    /// @notice withdraw the stake and the rewards from the contract
    function exit() external nonReentrant whenNotPaused() {
        address _sender = _msgSender();

        _processRewards(_sender);
        _withdrawStake(_sender, _balances[_sender]);
        _withdrawRewards(_sender);
        _updateContribution(_sender);
        emit Exit(_sender);
    }

    /// @notice withdraw the rewards from the contract
    /// @dev the user can withdraw his stake independently from the rewards
    function getReward() external nonReentrant whenNotPaused() {
        address _sender = _msgSender();

        _processRewards(_sender);
        _withdrawRewards(_sender);
        _updateContribution(_sender);
    }

    /// @notice as admin powers are really important in this contract
    /// we're overriding the renounceOwnership method to avoid losing rights
    function renounceOwnership() public view override onlyOwner {
        revert("ERC20RewardPool: can't renounceOwnership");
    }

    function _withdrawStake(address account, uint256 amount) internal antiWithdrawCheck(_msgSender()) {
        require(amount > 0, "ERC20RewardPool: Cannot withdraw 0");
        super._withdraw(amount);
        emit Withdrawn(account, amount);
    }

    function _withdrawRewards(address account) internal timeLockClaimCheck(account) {
        uint256 reward = rewards[account];
        uint256 mod;
        if (reward > 0) {
            if (amountLockClaim.claimLockEnabled == true) {
                // constrain the reward amount to the integer allowed
                mod = reward % DECIMALS_18;
                reward -= mod;
                require(
                    amountLockClaim.amount <= reward,
                    "ERC20RewardPool: Cannot withdraw - lockClaim.amount < reward"
                );
            }
            require(reward <= getRewardsAvailable(), "ERC20RewardPool: not enough rewards");
            rewards[account] = mod;
            rewardToken.safeTransfer(account, reward);
            emit RewardPaid(account, reward);
        }
    }

    function _updateContribution(address account) internal {
        uint256 oldContribution = _contributions[account];
        _totalContributions -= oldContribution;
        uint256 contribution = _computeContribution(account);
        _totalContributions += contribution;
        _contributions[account] = contribution;
        emit ContributionUpdated(account, contribution, oldContribution);
    }

    function _computeContribution(address account) internal returns (uint256) {
        if (contributionRules == IContributionRules(address(0))) {
            return Math.min(_balances[account], maxStakeAllowedCalculator(account));
        } else {
            return
                contributionRules.computeMultiplier(
                    account,
                    Math.min(_balances[account], maxStakeAllowedCalculator(account))
                );
        }
    }

    // Something changed (stake, withdraw, etc), we distribute current accumulated rewards and start from zero.
    // Called each time there is a change in contract state (stake, withdraw, etc).
    function _processRewards(address account) internal {
        _restartRewards();
        _processAccountRewards(account);
    }

    // Update the earnings for this specific user with what he earned until now
    function _processAccountRewards(address account) internal {
        // usually _earned takes _rewardPerToken() but in this method is zero because _restartRewards must be
        // called before _processAccountRewards
        rewards[account] = rewards[account] + _earned(account, 0);
        // restart rewards for this specific user, now earned(account) = 0
        userRewardPerTokenPaid[account] = rewardPerTokenStored;
    }

    function _restartRewards() internal {
        if (rewardCalculator != IRewardCalculator(address(0))) {
            // Distribute the accumulated rewards
            rewardPerTokenStored = rewardPerTokenStored + _rewardPerToken();
            // restart rewards so now the rewardCalculator return zero rewards
            rewardCalculator.restartRewards();
        }
    }

    function _earned(address account, uint256 rewardPerToken_) internal view returns (uint256) {
        // - userRewardPerTokenPaid[account] * _contributions[account]  / _totalContributions is the portion of
        //      rewards the last time the user changed his contribution and called _restartRewards
        //      (_totalContributions corresponds to previous value of that moment).
        // - rewardPerTokenStored * _contributions[account] is the share of the user from the
        //      accumulated rewards (from the start of time until the last call to _restartRewards) with the
        //      current value of _totalContributions
        // - _rewardPerToken() * _contributions[account]  / _totalContributions is the share of the user of the
        //      rewards from the last time anybody called _restartRewards until this moment
        //
        // The important thing to note is that at any moment in time _contributions[account] / _totalContributions is
        // the share of the user even if _totalContributions changes because of other users activity.
        return
            ((rewardPerToken_ + rewardPerTokenStored - userRewardPerTokenPaid[account]) * _contributions[account]) /
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

    /// @dev Triggers stopped state.
    /// The contract must not be paused.
    function pause() external onlyOwner {
        _pause();
    }

    /// @dev Returns to normal state.
    /// The contract must be paused.
    function unpause() external onlyOwner {
        _unpause();
    }

    function _msgSender() internal view override(Context, ERC2771HandlerV3) returns (address) {
        return ERC2771HandlerV3._msgSender();
    }

    function _msgData() internal view override(Context, ERC2771HandlerV3) returns (bytes calldata) {
        return ERC2771HandlerV3._msgData();
    }
}
