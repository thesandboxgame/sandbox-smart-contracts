---
breaks: false

description: Sand contract description

---

# [Sand Smart contract](https://github.com/thesandboxgame/sandbox-smart-contracts/blob/master/src/solc_0.5/Sand.sol)

## Introduction

This contract implements an [ERC20](https://eips.ethereum.org/EIPS/eip-20) compatible smart contract that is used to
represent the SAND token. The SAND token will be used for:

- Trading Assets among players
- Fee for minting Assets
- Staking in our curation / moderation system
- Paying for meta-transactions
- Voting decisions

## Model

The ERC20 compatibility is implemented in the ERC20BaseToken smart contract. The constructor creates an initial amount
of 3x10^27 Sand and assign them a beneficiary account.

The ERC20BaseToken smart contract also add two roles:

- Admin: A single account that can enable or disable super operators.
- Super Operators: A list of accounts that when enabled can burn Sand freely from any user account, transfer Sand from
  some account to another, etc.

Apart from the functionality given by the ERC20BaseToken there are two extra mixins that add the following roles:

- ERC20ExecuteExtension:
    - execution admin: can add or remove executionOperators
    - execution operators: can transfer or approve fund movements and execute calls to other contract on behalf of the
      Sand smart contract, using the address of the sand contract as msg.sender.
- ERC20BasicApproveExtension: Any user can do an approval and call another contract using the address of the sand
  contract as msg.sender.

|                     Feature | Description                                                                  |
|----------------------------:|:-----------------------------------------------------------------------------|
|                       ERC20 | https://eips.ethereum.org/EIPS/eip-20                                        |
|                 Upgradeable | No                                                                           |


