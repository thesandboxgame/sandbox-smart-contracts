---

breaks: false

description: ERC20RewardPool

---

# ERC20RewardPool

## Introduction
The contract manages two ERC20 compatible tokens:

1. One token is used by the user to stake
2. The second token is the one in which rewards are paid.

The two tokens can be the same, for example a user stakes Sand and gets rewards in Sand. To stake a user must approve and call the stake method of the ERC20RewardPool contract, internally the contract uses the StakeTokenWrapper to keep track of the staked amounts for each user.

The rewards given to each user depends on the share of the staked amount and the time period in which the user has staked his tokens:

```plantuml
:<math>int_(t0)^(t1) ("rate"(t) * "userContribution"(t)) / ("totalContribution"(t)) dt</math>;
```

Where:

- `t0` is the deposit time of the staked funds.
- `t1` is the withdrawal time of the staked funds.
- `rate` is calculated by the IRewardCalculator contract, it is time dependent and configured by the administrator.
- `userContribution` is the contribution for each user, it is calculated by the IContributionRules contract and is a formula that depends on the staked amount, lands, assets, avatars, etc.
- `totalContribution` is the sum of the contributions for all users.


### Reward Calculation

To calculate the rewards for each user the contract takes into account:
1. The contribution of the user: calculated based on the staked amount and other assets that the user owns like: lands, game assets, avatars, etc. The formula is implemented in a plugin contract separated from the main contract - ContributionRules.
2. The period in which the user staked his money: the rewards are proportional to the amount of time the user has staked multiplied by a rate that is calculated by another plugin smart contract - RewardCalculator. 

### Rate Calculation

The rate calculator plugin is a contract that calculates the accumulated absolute rewards that must be distributed for a period of time. The period of time depends on the current block timestamp and the user's calls to the main contract (eg: staking, withdraw, etc.).

Each time a user calls the main contract to change something (stake, withdraw, etc.), the main contract does the accounting, distributing the current rewards between all the stakers. Then the reward calculator plugin is restarted and when called later calculates the rewards between current timestamp and the restart moment.

The rate calculators must implement the IRewardCalculator interface:

- `getRewards:` return the current absolute rewards accumulated after the last call to restartRewards.
restartRewards: restart the calculator, if called immediately, getRewards will return zero.

- `TwoPeriodsRewardCalculator:` This contract has two periods and two corresponding rates and durations. After an initial call that sets the first period duration and rate another all can be done to set the duration and rate for the next period. When the first period finishes, the next period becomes the current one, and then the parameters for the future next period can be set again. This way the rate for the next period can be set at any moment.

### Contribution Rules

The contribution rules is a plugin contract that takes the amount staked and the address of the user and returns the absolute share (contribution) that the user will get from the total rewards. The contribution rules must implement the IContributionRules interface. This interface has only one method: computeMultiplier which takes the account and amountStaked parameters and returns the contribution for this user. The contribution is calculated using the following rules:

- `ERC1155 Multiplier:` Apply multiplier for specific ERC1155 ids, defined in a list. Example: 
0x123456789123456789, <8796,4567,7843,0967,6635>, <1.1 , 1.2 , 1.2 , 1.5 , 1.2, landMultiplier>
The ERC1155 with ID=8796 has a multiplier of 1.1, the ERC1155 with ID=4567 has a multiplier of 1.2, etc.
<<0x123456789123456789, <8796,4567,7843,0967,6635>, <1.1 , 1.1 , 1.2 , 1.5 , 1.2>>,<0x123456789123456789, <8796,4567,7843,0967,6635>, <1.1 , 1.1 , 1.2 , 1.5 , 1.2>>>

- `ERC721 Multiplier:` Apply multiplier for specific ERC721 ids, defined in a list (same as the previous one) and / or check the balance that the user has of a specific ERC721 contract and use the following formula to calculate the multiplier:

```
uint256 _multiplierERC721 =
            NFT_FACTOR_6 * (NFT_CONSTANT_3 + SafeMathWithRequire.cbrt3((((balERC721 - 1) * ROOT3_FACTOR) + 1)));
        if (_multiplierERC721 > MIDPOINT_9) {
            _multiplierERC721 = MIDPOINT_9 + (_multiplierERC721 - MIDPOINT_9) / 10;
        }
```

The admin of the contract can add, update, and delete the lists at any time. 


### Requirement Rules

The base contract (ERC20RewardPool) inherits from this one. This contract contains and checks all the requirements that a user needs to meet in order to stake. These requirements are checked through the modifier checkRequirements at the moment of the stake. Here's how it works:

- The contract holds lists of requirements for both ERC1155 and ERC721. These lists work similar to the Multipliers: For each contract, we have a minimum amount that the user needs to have of a specific asset, a list of ids, and the max amount we are going to allow the user to stake. 
Example: I need to own at least 2 assets (minAmount) in the specific contract 0x123456789123456, with the ID <1256,2569,5897> (List), and I can stake a max amount of 1000 ERC20 tokens (maxStake). Each id I own allows me to stake 1000 ERC20 tokens. If I have 3 ids, but only 2 in the list, I can stake 2000 ERC20 tokens. If I have 0 assets in the specified list, I can’t stake.
  - The admin of the contract can add, update, and delete the lists at any time. 
- We also have the maxStakeOverall variable, that is considered when the user has no ERC721 and ERC1155. 
- We first check if the user has the minimum amount required to stake and then the maximum amount he is allowed to stake. 
- If the user meets multiple criteria, we use the following formula to calculate the max stake amount: min(maxStakeOverall, maxStakeERC721 + maxStakeERC1155).

### Lock Rules
The base contract (ERC20RewardPool) also inherits from this one. In this contract, we handle all the rules related to: Deposit, withdrawal, and claim. Basically, we have time locks for each action, where we can force the user to wait for a specific amount of time (lockPeriodInSecs) to re-do any of these actions. 
For the claim action, we also have the amountLockClaim(amount, bool). With this requirement, we can set a minimum amount to claim and also constrain the claim to an integer.

Example:

- amountLockClaim(1,1): I have 32.4 rewards to claim, I can claim 32 tokens. The 0.4 are still to claim, once the amount >=1.
- amountLockClaim(1,1): I have 0.5 to claim. I can’t claim.
- amountLockClaim(0,1): I have 0.5 to claim. I can’t claim 0.
- amountLockClaim(1,0): I have 0.5 to claim. I can claim 0.5.
- amountLockClaim(1,0): I have 32.4 to claim. I can claim 32.4.
- amountLockClaim(0,0): I have 0.5 to claim. I can claim 0.5.


## Class diagram

```plantuml
entity ERC20RewardPool {
   + setRewardToken()
   + setStakeToken()
   + setTrustedForwarder()
   + setContributionRules()
   + setRewardCalculator()
   + recoverFunds()
   + totalSupply()
   + balanceOf()
   + stakeToken()
   + getRewardsAvailable()
   + totalContributions()
   + contributionOf()
   + rewardPerToken()
   + earned()
   + restartRewards()
   + computeContribution()
   + computeContributionInBatch()
   + stake()
   + withdraw()
   + exit()
   + getReward()
}
entity ContributionRules {
  + computeMultiplier()
  + setERC1155MultiplierList()
  + setERC721MultiplierList()
  + getERC721MultiplierList()
  + getERC1155MultiplierList()
  + deleteERC721MultiplierList()
  + deleteERC1155MultiplierList()
  + isERC721MemberMultiplierList()
  + isERC1155MemberMultiplierList()
  + multiplierBalanceOfERC721()
  + multiplierBalanceOfERC1155()
  + multiplierLogarithm()
}
entity RequirementRules {
  + setMaxStakeOverall()
  + setERC721tRequirementList()
  + setERC1155RequirementList()
  + getERC721RequirementList()
  + getERC1155RequirementList()
  + deleteERC721RequirementList()
  + deleteERC1155RequirementList()
  + isERC721MemberRequirementList()
  + isERC1155MemberRequirementList()
  + getERC721MaxStake()
  + getERC1155MaxStake() 
  + checkERC1155MinStake()
  + checkERC721MinStake()
  + maxStakeAllowedCalculator()
  + getERC721BalanceId()
  + getERC1155BalanceId()
}
entity LockRules {
  + setTimelockClaim()
  + setTimelockDeposit()
  + setTimeLockWithdraw()
  + setAmountLockClaim()
  + getRemainingTimelockClaim()
  + getRemainingTimelockWithdraw()
  + getRemainingTimelockDeposit()
}

entity TwoPeriodsRewardCalculator{
  + getRate()
  + getFinish()
  + getRewards()
  + restartRewards()
  + setSavedRewards()
  + runCampaign()
  + setInitialCampaign()
  + updateNextCampaign()
  + updateCurrentCampaign()
  + isCampaignFinished()
  + isCampaignRunning()
}

interface IContributionRules {
  + computeMultiplier()
}

interface IRewardCalculator {
    + getRewards()
    + restartRewards()
}
 
ERC20RewardPool ..> IContributionRules
ERC20RewardPool ..> IRewardCalculator  
ERC20RewardPool <|.. RequirementRules
ERC20RewardPool <|.. LockRules

IContributionRules <|.. ContributionRules
IRewardCalculator <|.. TwoPeriodsRewardCalculator


```

### Properties

- The contract is Upgradeable.

| Feature            | Link                                                                                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------    |
| Contract           | [ERC20RewardPool.sol](https://github.com/thesandboxgame/sandbox-smart-contracts/blob/master/src/solc_0.8/defi/ERC20RewardPool.sol)|
| ERC2771 (Meta-Tx)  | [Custom Sandbox contract](https://github.com/thesandboxgame/sandbox-smart-contracts/blob/master/src/solc_0.8/common/BaseWithStorage/ERC2771Handler.sol) |
| AccessControl      | Role-Based Access Control
| ReentrancyGuard    | Prevent reentrant calls to a function
