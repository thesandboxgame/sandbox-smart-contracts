# $SAND<>$ETH LP tokens staking

## intro

The aim of this document is to explain how the LP token ($SAND-ETH) staking currently works in "The sandbox" environment.

## liquidity pool explanation

First a brief explanation of how liquidity pool works: <https://www.youtube.com/watch?v=cizLhxSKrAc>

The user who wants to stake his tokens has to follow a some steps outside the sandbox before he can stake.
He has to go to the Dex (currently uniswap) and provide $SAND **AND** ETH. He receives in exchange some LP tokens that he can stake on <https://staking.sandbox.game>.

## staking LP tokens

When the LP tokens are deposited on the staking contract, every user in this contract share the reward allocated by The sandbox.

Formula : SAND*EARNED (per tick) = POOL_SHARE * POOL*REWARD * TICK_RATE / POOL_DURATION

- POOL_SHARE
  The amount of LP possessed against the total LP in the pool
  The amount of $LAND owned by the user impacts the POOL_SHARE as such: <https://www.desmos.com/calculator/rb58jmfxyy>

| $LAND owned  | LP Multiplier |
| ------------ | ------------- |
| 0            | 1             |
| 1            | 1.1           |
| 100          | 1.5           |
| 1,000        | 1.54          |
| 10,000       | 1.65          |

- POOL_REWARD
  The amount of $SAND in the pool
- TICK_RATE
  The amount of time for a tick to reward $SAND to all shares in the pool
- POOL_DURATION
  The overall duration of the liquidity mining campaign

## design

```plantuml
title sequence diagram

actor user
actor "The Sandbox"
entity uniswap

== Initialization of the staking reward ==
"The Sandbox" -> "staking contract": Deposit all the $SAND reward for the current period
"The Sandbox" -> "staking contract": notifyRewardAmount(uint256 reward)

== User stake ==
user -> uniswap: Send ETH **and** $SAND
uniswap -> user: Received $SAND<>ETH LP tokens
user -> "staking contract": stake(uint256 amount)
"staking contract" --> user: emit Staked(msg.sender, amount)

== User get some amount of money back ==
user -> "staking contract": withdraw(uint256 amount)
"staking contract" --> user: emit Withdrawn(msg.sender, amount)
== User retrieve reward ==
user -> "staking contract": getReward()
"staking contract" --> user: emit RewardPaid(msg.sender, reward)

== User get all money and reward back ==
user -> "staking contract": exit()
"staking contract" --> user: emit Withdrawn(msg.sender, balanceOfUser)
"staking contract" --> user: emit RewardPaid(msg.sender, reward)
```

```plantuml
title class diagram
class PolygonLPTokenWrapper {
    + stake(uint256 amount)
    + withdraw(uint256 amount)
}
class PolygonLandWeightedSANDRewardPool {
    - modifier updateReward(address account)
    + stake(uint256 amount)
    + withdraw(uint256 amount)
    + exit()
    + getReward()
    + notifyRewardAmount(uint256 reward)
    + computeContribution(uint256 amountStaked, uint256 numLands) returns (uint256)

}
class ReentrancyGuard #palegreen
class Ownable #palegreen
abstract IRewardDistributionRecipient {
    + address rewardDistribution
    + notifyRewardAmount(uint256 reward)
}

note "Openzeppelin contracts" as Oz
Oz .. Ownable
Oz .. ReentrancyGuard


PolygonLPTokenWrapper <|-- PolygonLandWeightedSANDRewardPool
ReentrancyGuard <|-- PolygonLandWeightedSANDRewardPool
IRewardDistributionRecipient <|-- PolygonLandWeightedSANDRewardPool
Ownable <|-- IRewardDistributionRecipient
```
