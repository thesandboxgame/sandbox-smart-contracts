---

breaks: false

description: SandRewardPool contract

---

# SandRewardPool

## Introduction

The sand reward pool is an implementation of the [sand-staking](./liquidity-provider/sand-staking.md) functionality.
The contract manages two ERC20 compatible tokens:

1. One token is used by the user to stake
2. The second token is the one in which rewards are paid.

The two tokens can be the same, for example a user stakes Sand and get rewards in Sand. To stake a user must approve and
call the `stake` method of the SandRewardPool contract, internally the contract uses the StakeTokenWrapper to keep track
of the stacked amounts for each user.

The rewards given to each user depends on the share of the stacked amount and the time period in which the user has
stacked his tokens:

```plantuml
:<math>int_(t0)^(t1) ("rate"(t) * "userContribution"(t)) / ("totalContribution"(t)) dt</math>;
```

Where:

- `t0` is deposit time of the stacked funds.
- `t1` is the withdrawal time of the stacked funds.
- `rate` is calculated by the IRewardCalculator contract, it is time dependant and configured by the administrator.
- `userContribution` is the contribution for each user, it is calculated by the IContributionCalculator contract and is
  a formula that depends on the stacked amount, lands, assets, etc.
- `totalContribution` is the sum of the contributions for all users.

### Reward calculation

To calculate the rewards for each user the contract takes into account:

1. The contribution of the user: calculated based on the staked amount and other assets that the user owns like: lands,
   game assets, etc. The formula is implemented in a plugin contract separated from the main contract.
2. The period in which the user stacked his money: the rewards are proportional to the amount of time the user has
   stacked multiplied by a rate that is calculated by another plugin smart contract.

### Contribution calculators

The contribution calculator is a plugin contract that takes the amount stacked and the address of the user and must
return the absolute share (contribution) that the user will get from the total rewards. The contribution calculators
must implement the `IContributionCalculator` interface. This interface has only one method:

* `computeContribution` it takes the `account` and `amountStaked` parameters and return the contribution for this user.

We have two implementations:

1. LandOwnerContributionCalculator: revert if the user doesn't own any land (lands == 0) or use the staked amount as the
   contribution. A pool that uses this calculator is meant to give rewards only to landowners.
2. LandContributionCalculator: the contribution calculation is based on the following
   formula: `contribution(stake, lands) = amountStaked * ( 1 + (9000 + cbrt3((((numLands - 1) * 697) + 1))) / 100000 )`
   where cbrt3 is the cube root. A pool that uses this calculator is open to everybody but gives more rewards to those
   landowners that have more lands.

### Rate calculators

The rate calculator plugin is a contract that calculates the accumulated absolute rewards that must be distributed for a
period of time. The period of time depends on the current block timestamp and the users calls to the main contract (eg:
stacking, withdraw, etc.).

Each time a user call the main contract to change something (stake, withdraw, etc.), the main contract does the
accounting distributing the current rewards between all the stackers. Then the reward calculator plugin is restarted
and when called later calculates the rewards between current timestamp and the restart moment.

The rate calculators must implement the `IRewardCalculator` interface:

* `getRewards`: return the current absolute rewards accumulated after the last call to `restartRewards`.

* `restartRewards`: restart the calculator, if called immediately, `getRewards` will return zero.

We have two implementations:

1. PeriodicRewardCalculator: This contract has a fixed period declared during construction. The first
   time `notifyRewardAmount` is called it start distributing the given rewards at a fixed `rate=rewards/duration`. If
   there is another call the remaining rewards are added to the rewards given and the distribution rate is recalculated.

2. TwoPeriodsRewardCalculator: This contract has two periods and two corresponding rates and durations. After an initial
   call that sets the first period duration and rate another all can be done to set the duration and rate for the next
   period. When the first period finishes, the next period becomes the current one, and then the parameters for the future
   next period can be set again. This way the rate for the next period can be set at any moment.

## Model

```plantuml
interface IContributionCalculator {
    + computeContribution(address account, uint256 amountStaked)
}
interface IRewardCalculator {
    + getRewards()
    + restartRewards()
}

entity SandRewardPool {
   + stake(uint256 amount)
   + withdraw(uint256 amount)
   + exit()
   + getReward()
}
entity LandOwnerContributionCalculator
entity LandContributionCalculator
entity PeriodicRewardCalculator
entity TwoPeriodsRewardCalculator
 
SandRewardPool ..> IContributionCalculator 
SandRewardPool ..> IRewardCalculator   

IContributionCalculator <|.. LandOwnerContributionCalculator 
IContributionCalculator <|.. LandContributionCalculator
IRewardCalculator <|.. PeriodicRewardCalculator
IRewardCalculator <|.. TwoPeriodsRewardCalculator

```

## Sequence diagram

```plantuml
title Stake
actor User

User -> StakeToken: Approve transfer for SandRewardPool
User -> SandRewardPool: Stake(amount)
StakeToken -> SandRewardPool: send funds
group Update contribution and reward accounting
   SandRewardPool -> IContributionCalculator: computeContribution(user, amount)
   IContributionCalculator -> SandRewardPool: contribution
   SandRewardPool -> SandRewardPool: update contributions 
   SandRewardPool -> IRewardCalculator: getReward()
   IRewardCalculator -> SandRewardPool: absolute rewards
   SandRewardPool -> SandRewardPool: update acounting of rewards per user
   SandRewardPool -> IRewardCalculator: restartRewards()
end 
... Later ...
User -> SandRewardPool: earnings(time)
SandRewardPool -> User: updated earnings(time) 
```

```plantuml
title Withdraw
actor User

User -> SandRewardPool: Withdraw(amount)
group Update contribution and reward accounting
   SandRewardPool -> IContributionCalculator: computeContribution(user, amount)
   IContributionCalculator -> SandRewardPool: contribution
   SandRewardPool -> SandRewardPool: update contributions 
   SandRewardPool -> IRewardCalculator: getReward()
   IRewardCalculator -> SandRewardPool: absolute rewards
   SandRewardPool -> SandRewardPool: update acounting of rewards per user
   SandRewardPool -> IRewardCalculator: restartRewards()
end 
SandRewardPool -> StakeToken: transfer
StakeToken -> User: get staked tokens 
```

```plantuml
title getRewards
actor User

User -> SandRewardPool: getRewars()
group Update contribution and reward accounting
   SandRewardPool -> IContributionCalculator: computeContribution(user, amount)
   IContributionCalculator -> SandRewardPool: contribution
   SandRewardPool -> SandRewardPool: update contributions 
   SandRewardPool -> IRewardCalculator: getReward()
   IRewardCalculator -> SandRewardPool: absolute rewards
   SandRewardPool -> SandRewardPool: update acounting of rewards per user
   SandRewardPool -> IRewardCalculator: restartRewards()
end 
SandRewardPool -> RewardToken: transfer
RewardToken -> User: get rewarded tokens 
```

### Properties

- The contract is Upgradeable.

| Feature            | Link                                                                                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------    |
| Contract           | [SandRewardPool.sol](https://github.com/thesandboxgame/sandbox-smart-contracts/blob/master/src/solc_0.8/defi/SandRewardPool.sol)|
| ERC2771 (Meta-Tx)  | [Custom Sandbox contract](https://github.com/thesandboxgame/sandbox-smart-contracts/blob/master/src/solc_0.8/common/BaseWithStorage/ERC2771Handler.sol) |
| AccessControl      | Role-Based Access Control
