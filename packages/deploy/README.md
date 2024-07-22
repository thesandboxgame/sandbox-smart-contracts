# TSB contracts deploy

This package is used to compile, deploy, test, upgrade and keep track of the
contracts we use in our environments.

## Compilation

The source code of the contracts is imported via `npm` dependencies (except for
some mocks used for testing). For example the instant giveaway contract
`SignedMultiGiveaway.sol` is imported from the package
`@sandbox-smart-contracts/giveaway` that is in this same monorepo by adding the
dependency to the `package.json` file.

We use `hardhat` to compile the project and to compile code from other packages
we have a specific task `importedPackages` that adapts the compilation workflow
to our needs. The task is configured via the key `importedPackages` in the
`hardhat.config.ts` file. `importedPackages` is a javascript object. The keys
are the package name and the value is the paths to the source code inside the
package, for example:

```solidity
const importedPackages = {
  '@sandbox-smart-contracts/giveaway': 'contracts/SignedMultiGiveaway.sol',
};
```

## Deployment

To deploy the contract we use
[hardhat-deploy](https://github.com/wighawag/hardhat-deploy) you can check the
manual for the specifics, the only think you must take into account is to use
the Fully Qualified Name of the contract when deploying it ( see:
[reading-artifacts](https://hardhat.org/hardhat-runner/docs/advanced/artifacts#reading-artifacts)),
for example:
`'@sandbox-smart-contracts/giveaway/contracts/SignedMultiGiveaway.sol:SignedMultiGiveaway'`
for the `SignedMultiGiveaway` contract.

To execute a deployment run: `yarn deploy --network NETWORK --tags SOMETAGS`
where:

- `NETWORK` is the network name like: `mumbai`, `goerli`, `polygon`, `mainet`,
  etc
- `SOMETAGS` are the tags used to limit which deployment scripts will be
  executed ( see:[hardhat-deploy](https://github.com/wighawag/hardhat-deploy)
  configuration)

- There is a specific set of tags related to network on which each script was
  meant to run.
  - L1 = 'L1', // Layer one networks like Ethereum mainnet, sepolia
  - L1_PROD = 'L1-prod', // Layer one production networks like Ethereum mainnet
  - L1_TEST = 'L1-test', // Layer one test networks like Goerli
  - L2 = 'L2', // Layer two networks like Polygon, mumbai
  - L2_PROD = 'L2-prod', // Layer two production networks like Polygon
  - L2_TEST = 'L2-test', // Layer two test networks like Mumbai

## Upgrades

1. Modify smart contracts, add tests, and update documentation in the respective
   package. Submit these changes for review via a Pull Request (PR).

2. Create an upgrade script, referring to
   `packages/deploy/deploy/300_catalyst/303_upgrade_catalyst.ts` as an example.

3. Ensure the upgrade index in the script is higher than the previous one,
   verifying manually.

4. Once the contract(s) is reviewed, publish to NPM as a release candidate (RC).
   Increment the minor version and suffix with `-rc.0`. For subsequent RC
   versions, increment the patch number (e.g., `1.1.0-rc.1`).

5. For non-critical upgrades, you may release a stable version directly
   post-upgrade, skipping the RC stage.

6. Test the upgrade on a fork of the live network before deploying to the live
   network.

7. Update the dependency version in `packages/deploy/package.json`, then run
   `yarn install` in the deploy package. For example:
   `~"@sandbox-smart-contracts/asset": "1.0.3"~ =>
   "@sandbox-smart-contracts/asset": "1.1.0"``

8. Run the upgrade script, e.g.,
   `yarn hardhat deploy --network polygon --tags Catalyst-upgrade`.

9. After completing the upgrade, publish the RC as a stable release, removing
   the `-rc.0` suffix.

10. For npm publication, ensure you are logged in to NPM. Use
    [release-it](https://github.com/release-it/release-it) for npm package
    releases. In the upgraded package directory, run `yarn release`, which
    prompts for the new version number and updates the `package.json` file.

> [!IMPORTANT]  
> WE ALWAYS FILTER BY `TAGS` IN DEPLOY SCRIPTS
>
> Hardhat deploy provides different means to filter which deploy scripts to run.
> Don't use `func.skip` or conditional `if` inside you deploy scripts.
>
> Only for testing purposes while running into the hardhat node you can put some
> scripts inside the `deploy_mock` directory.

## Testing

We assume that the imported contracts are well tested in their own package by
having enough unit tests and more that 80% coverage. This repo contains
integrations tests, tests for the deployment process and tests that verify the
integrity of the system. For example in the case of the `SignedMultiGiveaway`
contract we check the roles and the users assigned to them are correctly
configured.

To test the deployment process:

- run all the deployment scripts on the hardhat local node just to test them:
  `yarn deploy`
- run the deployments scripts over a forks of a live network:
  `fork:deploy NETWORK` where NETWORK is `mainnet`,`polygon` ,`goerli`,`mumbai`,
  etc.

The tests the integrity of the system:

- using hardhat local node and `hardhat-deploy` deployment scripts: `yarn test`
- on a live network over contracts that are already deployed:
  `yarn test --network NETWORK`. Where NETWORK is `mainnet` , `polygon`,
  `mumbai`, etc.
- on a fork of a live network and `hardhat-deploy` deployment scripts:
  `yarn fork:test NETWORK` where NETWORK is
  `mainnet`,`polygon`,`goerli`,`mumbai`, etc.

### Tweaking hardhat when forking a live network

We are using some tricks to control the way we run `hardhat` and
`hardhat-deploy` when forking live networks. We change the `hardhat`
configuration depending on some environment variables to be able to run the
fork, avoid running some deployment scripts or skip the deployment scripts at
all. The following table describes the environment variables and their use:

| Environment variable                   | Origin            | Description                                                                                                                   |
| -------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| HARDHAT_FORK=mumbai                    | hardhat.config.ts | configure the hardhat network with forking enabled                                                                            |
| HARDHAT_DEPLOY_ACCOUNTS_NETWORK=mumbai | hardhat-deploy    | use this network for [named accounts](https://github.com/wighawag/hardhat-deploy#1-namedaccounts-ability-to-name-addresses)   |
| HARDHAT_DEPLOY_FIXTURE=true            | hardhat-deploy    | run the deployment scripts before running the tests                                                                           |
| HARDHAT_DEPLOY_NO_IMPERSONATION=true   | hardhat-deploy    | Optional. Don't [impersonate unknown accounts](https://hardhat.org/hardhat-network/docs/reference#hardhat_impersonateaccount) |
| HARDHAT_FORK_INCLUDE_MOCKS=false       | hardhat.config.ts | Optional. Include mock deploy scripts in the fork                                                                             |
| HARDHAT_SKIP_FIXTURES=false            | hardhat.config.ts | Optional. Skip all the deployment scripts                                                                                     |
| HARDHAT_FORK_NUMBER=9999999999         | hardhat.config.ts | Optional. Forking block number                                                                                                |

There is a `npmScriptHlper` script used in the `package.json` file to simplify
the execution of hardhat while setting the right environment variables. Run
`node utils/npmScriptHelper.js` to see the script usage.

## Contract verification

To verify the contracts we use the
[hardhat-deploy](https://github.com/wighawag/hardhat-deploy#4-hardhat-etherscan-verify)
plugin support for verification, check the manual for details.

To do the verification on etherscan/polygonscan you must:

- set the environment variable `ETHERSCAN_API_KEY` with the api-key obtained
  from the etherscan in the `.env` file
- run the following command: `yarn hardhat etherscan-verify --network NETWORK`,
  where NETWORK is mainnet, polygon, mumbai, etc.

To verify just one contract add the `--contract-name CONTRACT_NAME` argument
where CONTRACT_NAME is the name of the contract to verify, if you are using
upgradable contract you must verify `CONTRACT_NAME_Proxy` and
`CONTRACT_NAME_Implementation` separately.

# Adding contract from a new package

- add the dependency to the `package.json` file as usual (`yarn add`).
- add an entry to the `importedPackages` in the `hardhat.config.ts` file so the
  code is compiled.
- add the deployment scripts to the `deploy` directory. Check the
  [hardhat-deploy](https://github.com/wighawag/hardhat-deploy) docs on how to
  write deployments scripts.
- In the deployment scripts use the Fully Qualified Name of the contract, see:
  [reading-artifacts](https://hardhat.org/hardhat-runner/docs/advanced/artifacts#reading-artifacts)
