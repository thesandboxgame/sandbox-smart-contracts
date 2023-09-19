# FaucetsERC1155 Contract Documentation

This contract is designed to allow the distribution of ERC1155 tokens from multiple faucets on testnet. Each faucet can have its own distribution settings, and only the owner can manage these faucets.

## Prerequisites:

- This contract makes use of the OpenZeppelin library for standard ERC and utility contracts.
- Solidity version: 0.8.2.

## Features:

1. Ability to add, enable, disable, and remove faucets.
2. Customize each faucet with a distribution limit and waiting period.
3. Withdraw tokens from the faucet.
4. Claim tokens from the faucet.

## Events:

- `FaucetAdded`: Emitted when a new faucet is added.
- `TokenAdded`: Emitted when a new token ID is added to a faucet.
- `FaucetStatusChanged`: Emitted when a faucet is enabled or disabled.
- `PeriodUpdated`: Emitted when the claim period for a faucet is updated.
- `LimitUpdated`: Emitted when the claim limit for a faucet is updated.
- `Claimed`: Emitted when tokens are claimed from a faucet.
- `Withdrawn`: Emitted when tokens are withdrawn from the contract.

## Structs:

- `FaucetInfo`: Contains information about each faucet, such as its enabled status, claim period, claim limit, and associated token IDs.

## Modifiers:

- `exists`: Checks if the specified faucet exists.

## Functions:

1. `getPeriod`: Returns the claim period for the specified faucet.
2. `setPeriod`: Sets the claim period for the specified faucet.
3. `getLimit`: Returns the claim limit for the specified faucet.
4. `setLimit`: Sets the claim limit for the specified faucet.
5. `addFaucet`: Adds a new faucet with the specified settings.
6. `removeFaucet`: Removes the specified faucet and transfers any remaining tokens to the owner.
7. `enableFaucet`: Enables the specified faucet.
8. `disableFaucet`: Disables the specified faucet.
9. `removeTokens`: Removes specific token IDs from the specified faucet and transfers the associated tokens to the owner.
10. `claim`: Claims a specified amount of a specified token from the specified faucet.
11. `withdraw`: Withdraws tokens from the contract to a specified address.
12. `_withdraw`: Internal function to handle withdrawal logic.
13. `claimBatch`: Claims multiple tokens from a specified faucet in a single transaction.

## Notes:

- This contract is designed to work with ERC1155 tokens, which are multi-token standard contracts.
- The owner has the ability to manage faucets, but individual users can claim tokens from the faucets based on the configured settings.
