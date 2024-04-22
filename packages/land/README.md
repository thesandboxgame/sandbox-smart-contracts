# LAND

A [LAND](https://sandboxgame.gitbook.io/the-sandbox/land/what-is-land) is a
digital piece of real-estate in The Sandbox's metaverse. Each LAND is a unique
piece of the metaverse map which is a grid of 408x408 lands.

## Architecture

The main goal of this package is to merge the base code of the 2 LAND contracts
that has been deployed on ethereum & polygon networks in order to unify the
features and reduce the technical differences. Learn more about the differences
between the 2 contracts & this upgrade in
[this documentation](contracts/LandUpgrade.md).

The package contains 3 main contracts:

| Component                                                 | Description                                                                    |
| --------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [Land](contracts/Land.md)                                 | ERC721 contract handling the LAND tokens deployed on the ethereum network (L1) |
| [PolygonLand](contracts/PolygonLand.md)                   | ERC721 contract handling the LAND tokens deployed on the polygon network (L2)  |
| [LandMetadataRegistry](contracts/LandMetadataRegistry.md) | Contract managing extra metadata onchain like premiumness & neighborhood       |

## Running the project locally

Install dependencies with `yarn`

Testing: Use `yarn test` inside `packages/land` to run tests locally inside this
package

For testing from root (with workspace feature) use:
`yarn workspace @sandbox-smart-contracts/land test`

Coverage: Run `yarn coverage`

Formatting: Run `yarn format` to check and `yarn format:fix` to fix formatting
errors

Linting: Run `yarn lint` to check and `yarn lint:fix` to fix static analysis
errors

## Deployment

This package exports the contract source code, for deployments see:
[@sandbox-smart-contract/deploy](../deploy) package.

## Dependencies

- [@manifoldxyz/royalty-registry-solidity](https://www.npmjs.com/package/@manifoldxyz/royalty-registry-solidity)
- [@openzeppelin/contracts](https://www.npmjs.com/package/@openzeppelin/contracts):
  OpenZeppelin Contracts is a library for secure smart contract development.
- [@openzeppelin/contracts-upgradeable](https://www.npmjs.com/package/@openzeppelin/contracts-upgradeable)
- [@sandbox-smart-contracts/dependency-metatx](https://www.npmjs.com/package/@sandbox-smart-contracts/dependency-metatx):
  ERC2771 Context
- [@sandbox-smart-contracts/dependency-royalty-management](https://www.npmjs.com/package/@sandbox-smart-contracts/dependency-royalty-management):
  Royalty Management
