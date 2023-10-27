# <PACKAGE>

The Sandbox Asset package for deploying on Polygon, consisting of the below
contracts.

Asset (ERC1155) L2 token. Asset's user-facing contracts: AssetCreate,
AssetReveal. AuthSuperValidator. Catalyst (ERC1155) L2 token.

## Running the project locally

Install dependencies with `yarn`

Testing: Use `yarn test` inside `packages/<package>` to run tests locally inside
this package

For testing from root (with workspace feature) use:
`yarn workspace @sandbox-smart-contracts/<package> test`

Coverage: Run `yarn coverage`

Formatting: Run `yarn prettier` to check and `yarn prettier:fix` to fix
formatting errors

Linting: Run `yarn lint` to check and `yarn lint:fix` to fix static analysis
errors

## Deployment

This package exports the contract source code, for deployments see:
[@sandbox-smart-contract/deploy](../deploy) package.

## Dependencies

- [@openzeppelin/contracts](https://www.npmjs.com/package/@openzeppelin/contracts):
  OpenZeppelin Contracts is a library for secure smart contract development.
- [@openzeppelin/contracts-upgradeable](https://www.npmjs.com/package/@openzeppelin/contracts-upgradeable):
- [@sandbox-smart-contracts/dependency-metatx](https://www.npmjs.com/package/@sandbox-smart-contracts/dependency-metatx):
  ERC2771 Context
- [@sandbox-smart-contracts/dependency-royalty-management](https://www.npmjs.com/package/@sandbox-smart-contracts/dependency-royalty-management):
  Royalty Management
- [@sandbox-smart-contracts/dependency-operator-filter](https://www.npmjs.com/package/@sandbox-smart-contracts/dependency-operator-filter):
  Operator Filter
