# <PACKAGE>

PoC package for a generic DN404, an implementation of a co-joined ERC20 and ERC721 pair.

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

- [dn404 code authored by Vectorized](https://github.com/Vectorized/dn404)
