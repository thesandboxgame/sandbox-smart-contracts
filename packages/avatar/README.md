# Avatar

New avatar and related deployment contracts aim to ease the development and deployment of new Sandbox collections. 
This is done by optimizing logistic operations, even if some performance costs increases appear.

The entire system consists of an on-chain beacon proxy factory that will create collection proxies mapped to collection implementations.
Leveraging the Beacon Pattern into a Factory achieves the intended role of creating an instant upgrade mechanism for all beacon proxies while also supporting custom implementations for collections that require extra work.

System will be launched on Polygon.

## Creating a new package

You can copy-paste this example package: `cp -a packages/example-hardhat packages/avatar`

## Running the project locally

Install dependencies with `yarn`

Testing: Use `yarn test` inside `packages/avatar` to run tests locally inside this package

For testing from root (with workspace feature) use: `yarn workspace @sandbox-smart-contracts/avatar test`

Coverage: Run `yarn coverage`

Formatting: Run `yarn prettier` to check and `yarn prettier:fix` to fix formatting errors

Linting: Run `yarn lint` to check and `yarn lint:fix` to fix static analysis errors

## Deployment

This package exports the contract source code, for deployments see:
[@sandbox-smart-contract/deploy](../deploy) package.

## Dependencies

- [@openzeppelin/contracts](https://www.npmjs.com/package/@openzeppelin/contracts):
  OpenZeppelin Contracts is a library for secure smart contract development.
- [@openzeppelin/contracts-upgradeable](https://www.npmjs.com/package/@openzeppelin/contracts-upgradeable)
- [@sandbox-smart-contracts/core](https://www.npmjs.com/package/@sandbox-smart-contracts/core)
