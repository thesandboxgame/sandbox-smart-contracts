# TSB contracts deploy

This package is used to compile, deploy, test and keep track of the contracts we use in our environments.

## Compilation

The source code of the contracts is imported via `npm` dependencies (except for some mocks used for testing). For
example the instant giveaway contract `SignedMultiGiveaway.sol` is imported from the
package `@sandbox-smart-contracts/giveaway` that is in this same monorepo by adding the dependency to the `package.json`
file.

We use `hardhat` to compile the project and to compile code from other packages we have a specific
task `importedPackages` that adapts the compilation workflow to our needs. The task is configured via the
key `importedPackages` in the `hardhat.config.ts` file. `importedPackages` is a javascript object. The keys are the
package name and the value is the paths to the source code inside the package, for example:

``` solidity
const importedPackages = {
  '@sandbox-smart-contracts/giveaway': 'contracts/SignedMultiGiveaway.sol',
};
```

## Deployment

To deploy the contract we use [hardhat-deploy](https://github.com/wighawag/hardhat-deploy) you can check the manual for
the specifics, the only think you must take into account is to use the Fully Qualified Name of the contract when
deploying it (
see: [reading-artifacts](https://hardhat.org/hardhat-runner/docs/advanced/artifacts#reading-artifacts)), for
example: `'@sandbox-smart-contracts/giveaway/contracts/SignedMultiGiveaway.sol:SignedMultiGiveaway'` for the
`SignedMultiGiveaway` contract.

To execute a deployment run: `yarn deploy --network NETWORK --tags SOMETAGS`
where:

- `NETWORK` is the network name like: `mumbai`, `goerli`, `polygon`, `mainet`, etc
- `SOMETAGS` are the tags used to limit which deployment scripts will be executed (
  see:[hardhat-deploy](https://github.com/wighawag/hardhat-deploy) configuration)

## Testing

We assume that the imported contracts are well tested in their own package by having enough unit tests and more that 80%
coverage. This repo contains integrations tests and tests that verify the integrity of the system. For example in the
case of the `SignedMultiGiveaway` contract we check the roles and the users assigned to them are correctly configured.

The tests can be run in different contexts:

- on hardhat:
    - run all the deployment scripts just to test them: `yarn deploy`
    - run the integration tests using `hardhat-deploy` fixtures: `yarn test`
- on a real network `testnet` or `mainnet`, run the integration tests over contracts already deployed and fail if
  something is wrong, for example: `yarn test --network mumbai`
- to run on a fork of some network the following environment variables must be set:
    - HARDHAT_DEPLOY_FIXTURE=true
    - HARDHAT_FORK=mumbai
    - HARDHAT_DEPLOY_ACCOUNTS_NETWORK=mumbai

  and then `yarn test` can be executed for integration tests or `yarn deploy`
  with or without tags to test just the deployment scripts.

To simplify the execution of the integration tests over forks the following targets are added to the package.json
file: `fork:mainnet`, `fork:polygon`, `fork:goerli` and `fork:mumbai`.

# Adding contract from a new package

- add the dependency to the `package.json` file as usual (`yarn add`).
- add an entry to the `importedPackages` in the `hardhat.config.ts` file so the code is compiled.
- add the deployment scripts to the `deploy` directory. Check
  the [hardhat-deploy](https://github.com/wighawag/hardhat-deploy) docs on how to write deployments scripts.
- In the deployment scripts use the Fully Qualified Name of the contract,
  see: [reading-artifacts](https://hardhat.org/hardhat-runner/docs/advanced/artifacts#reading-artifacts)
