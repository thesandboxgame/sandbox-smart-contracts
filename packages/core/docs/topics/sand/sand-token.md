---
breaks: false

description: Sand contract description

---

# [Sand Smart contract](https://github.com/thesandboxgame/sandbox-smart-contracts/blob/master/src/solc_0.5/Sand.sol)

## Introduction

This contract implements an [ERC20](https://eips.ethereum.org/EIPS/eip-20) compatible smart contract
using [our custom ERC20 implementation](../token/ERC20.md) that is used to represent the SAND token.

The SAND token will be used for:

- Trading Assets among players
- Fee for minting Assets
- Staking in our curation / moderation system
- Paying for meta-transactions
- Voting decisions
- Buy lands

For a more detailed information see: [about SAND](https://sandboxgame.gitbook.io/the-sandbox/sand/what-is-sand)

## Model

The ERC20 compatibility is implemented in the ERC20BaseToken smart contract. The constructor creates an initial amount
of ***3e27*** Sand and assign them a beneficiary account.

See [our custom ERC20 implementation](../token/ERC20.md) for more details.

|                     Feature | Description                                                                  |
|----------------------------:|:-----------------------------------------------------------------------------|
|                       ERC20 | https://eips.ethereum.org/EIPS/eip-20                                        |
|                 Upgradeable | No, must use [OZ Initializabe](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable) |
|          Meta TX Compatible | No, must use [OZ Context](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/Context.sol)|
