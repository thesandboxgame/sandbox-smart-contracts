pragma solidity 0.6.5;

import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./IRewardDistributionRecipient.sol";
import "../common/Interfaces/ERC721.sol";
import "../common/Libraries/SafeMathWithRequire.sol";


contract LPTokenWrapper {
    using SafeMathWithRequire for uint256;
    using SafeERC20 for IERC20;

    uint256 private constant DECIMAL_18 = 1000000000000000000;

    IERC20 internal immutable _stakeToken;

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;

    constructor(IERC20 stakeToken) public {
        _stakeToken = stakeToken;
    }

    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    function stake(uint256 amount) public virtual {
        _totalSupply = _totalSupply.add(amount);
        _balances[msg.sender] = _balances[msg.sender].add(amount);
        _stakeToken.safeTransferFrom(msg.sender, address(this), amount);
    }

    function withdraw(uint256 amount) public virtual {
        _totalSupply = _totalSupply.sub(amount);
        _balances[msg.sender] = _balances[msg.sender].sub(amount);
        _stakeToken.safeTransfer(msg.sender, amount);
    }
}


contract LandWeightedSANDRewardPool is LPTokenWrapper, IRewardDistributionRecipient {
    using SafeMathWithRequire for uint256;

    uint256 public constant DURATION = 30 days; // Reward period
    uint256 constant DECIMAL_18 = 1000000000000000000;
    uint256 constant DECIMAL_12 = 1000000000000;

    uint256 public periodFinish = 0;
    uint256 public rewardRate = 0;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    uint256 internal _totalContributions;
    mapping(address => uint256) internal _contributions;

    uint256 internal immutable NFT_FACTOR_6;
    uint256 internal immutable NFT_CONSTANT_6;
    IERC20 internal immutable _rewardToken;
    ERC721 internal immutable _multiplierNFToken;

    event RewardAdded(uint256 reward);
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);

    constructor(
        IERC20 stakeToken,
        IERC20 rewardToken,
        ERC721 multiplierNFToken,
        uint256 nftFactor6,
        uint256 nftConstant6
    ) public LPTokenWrapper(stakeToken) {
        _rewardToken = rewardToken;
        _multiplierNFToken = multiplierNFToken;
        NFT_FACTOR_6 = nftFactor6;
        NFT_CONSTANT_6 = nftConstant6;
    }

    function totalContributions() public view returns (uint256) {
        return _totalContributions;
    }

    function contributionOf(address account) public view returns (uint256) {
        return _contributions[account];
    }

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        if (_totalContributions != 0) {
            // ensure reward past the first staker do not get lost
            lastUpdateTime = lastTimeRewardApplicable();
        }
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    function lastTimeRewardApplicable() public view returns (uint256) {
        return Math.min(block.timestamp, periodFinish);
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalContributions() == 0) {
            return rewardPerTokenStored;
        }
        return rewardPerTokenStored.add(lastTimeRewardApplicable().sub(lastUpdateTime).mul(rewardRate).mul(1e30).div(totalContributions()));
    }

    function earned(address account) public view returns (uint256) {
        return contributionOf(account).mul(rewardPerToken().sub(userRewardPerTokenPaid[account])).div(1e30).add(rewards[account]);
    }

    function computeContribution(uint256 amountStaked, uint256 numLands) internal view returns (uint256) {
        if (numLands == 0) {
            return amountStaked;
        }
        return amountStaked.add(amountStaked.mul(numLands.cbrt6().add(NFT_CONSTANT_6).mul(NFT_FACTOR_6)).div(DECIMAL_12));
    }

    // stake visibility is public as overriding LPTokenWrapper's stake() function
    function stake(uint256 amount) public override updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");
        super.stake(amount);
        uint256 contribution = computeContribution(amount, _multiplierNFToken.balanceOf(msg.sender));
        _totalContributions = _totalContributions.add(contribution);
        _contributions[msg.sender] = _contributions[msg.sender].add(contribution);
        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) public override updateReward(msg.sender) {
        require(amount > 0, "Cannot withdraw 0");
        super.withdraw(amount);
        uint256 ratio = amount.mul(DECIMAL_18).div(balanceOf(msg.sender));
        uint256 currentContribution = contributionOf(msg.sender);
        uint256 contributionReduction = currentContribution.mul(ratio).div(DECIMAL_18);
        _contributions[msg.sender] = currentContribution.sub(contributionReduction);
        emit Withdrawn(msg.sender, amount);
    }

    function exit() external {
        withdraw(balanceOf(msg.sender));
        getReward();
    }

    function getReward() public updateReward(msg.sender) {
        uint256 reward = earned(msg.sender);
        if (reward > 0) {
            rewards[msg.sender] = 0;
            _rewardToken.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    function notifyRewardAmount(uint256 reward) external override onlyRewardDistribution updateReward(address(0)) {
        if (block.timestamp >= periodFinish) {
            rewardRate = reward.div(DURATION);
        } else {
            uint256 remaining = periodFinish.sub(block.timestamp);
            uint256 leftover = remaining.mul(rewardRate);
            rewardRate = reward.add(leftover).div(DURATION);
        }
        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp.add(DURATION);
        emit RewardAdded(reward);
    }
}
