# <PACKAGE>

The Sandbox's operator-filter dependency package, for use by The Sandbox's token contracts.
Based on OpenSea's operator-filter.
This is a dependency package, and the smart contracts inside use floating pragma.

## Running the project locally

Install dependencies with `yarn`

Testing: Use `yarn test` inside `packages/<package>` to run tests locally inside this package

For testing from root (with workspace feature) use: `yarn workspace @sandbox-smart-contracts/<package> test`

Coverage: Run `yarn coverage`

Formatting: Run `yarn prettier` to check and `yarn prettier:fix` to fix formatting errors

Linting: Run `yarn lint` to check and `yarn lint:fix` to fix static analysis errors

## Package structure and minimum standards

#### A NOTE ON DEPENDENCIES

1. Add whatever dependencies you like inside your package; this template is for hardhat usage. OpenZeppelin contracts
   are highly recommended and should be installed as a dev dependency
2. For most Pull Requests there should be minimum changes to `yarn.lock` at root level
3. Changes to root-level dependencies are permissible, however they should not be downgraded
4. Take care to run `yarn` before pushing your changes
5. You shouldn't need to install dotenv since you won't be deploying inside this package (see below)

#### UNIT TESTING

1. Unit tests are to be added in `packages/<package>/test`
2. Coverage must meet minimum requirements for CI to pass
3. `getSigners` return an array of addresses, the first one is the default `deployer` for contracts, under no
   circumstances should tests be written as `deployer`
4. It's permissible to create mock contracts at `packages/<package>/contracts/mock` e.g. for third-party contracts
5. Tests must not rely on any deploy scripts from the `deploy` package; your contracts must be deployed inside the test
   fixture. See `test/fixtures.ts`

# Deployment

Each package must unit-test the contracts by running everything inside the `hardhat node`. Deployment to "real"
networks, configuration of our environment and integration tests must be done inside the `deploy` package.

The `deploy` package only imports `.sol` files. The idea is to recompile everything inside it and manage the entire
deploy strategy from one place.

1. Your deploy scripts should not be included inside `packages/<package>`: deploy scripts live inside `packages/deploy/`
2. The `deploy` package doesn't use the hardhat config file from the specific package. Instead, it
   uses `packages/deploy/hardhat.config.ts`
3. You will need to review `packages/deploy/hardhat.config.ts` and update it as needed for any new namedAccounts you
   added to your package
4. When it comes to deploy time, it is preferred to include deploy scripts and end-to-end tests as a separate PR
5. The named accounts inside the `deploy` package must use the "real-life" values
6. Refer to the readme at `packages/deploy` to learn more about importing your package

#### INTEGRATION TESTING

1. End-to-end tests live at `packages/deploy/`
2. You must add end-to-end tests ahead of deploying your package. Importantly, these tests should verify deployment and
   initialization configuration

# A NOTE ON MAKING PULL REQUESTS

1. Follow the PR template checklist
2. Your PR will not be approved if the above criteria are not met
