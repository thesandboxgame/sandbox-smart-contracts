# <PACKAGE>

*Include a high level description of this package here*

## Running the project locally

Install dependencies with `yarn`

Testing
Use `yarn test` inside `packages/<package>` to run tests locally for just this package

Coverage
Run `yarn coverage` 

Formatting
TODO

Linting
TODO

## Package structure and minimum standards

A NOTE ON DEPENDENCIES
1. Add whatever dependencies you like inside your package; this template is for hardhat usage
2. For most Pull Requests there should be minimum changes to `yarn.lock` at root level
3. Changes to root-level dependencies are permissible, however they should not be downgraded
4. Take care to run `yarn` before pushing your changes

UNIT TESTING
1. Unit tests are to be added in `packages/<package>/test`
2. Coverage must meet minimum requirements for CI to pass
3. Tests must use appropriate namedAccount(s) and contract ROLE set up, at `packages/<package>/hardhat.config.ts`
4. UnnamedAccounts must be set up for users within unit tests; under no circumstances should tests be written as `deployer`
5. It's permissible to create mock contracts at `packages/<package>/contracts/mock` e.g. for third-party contracts
6. Tests must not rely on any deploy scripts from the deploy package; your contracts must be deployed inside the test fixture. See example below.


GOOD EXAMPLE
    ```
    export const setupLand = withSnapshot([], async function (hre) {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();
    await deploy('TestAsset', {
        from: deployer,
        contract: 'Asset',
        args: [..],
        log: true,
    });
    const AssetContract = await ethers.getContract("TestAsset");

    ```

BAD EXAMPLE
    ```
    await deployments.fixture(["Asset"]);
    const AssetContract = await ethers.getContract("Asset");
    ```

DEPLOY SCRIPTS
The deploy package only imports `.sol` files. 
The idea is to recompile everything inside the deploy package and manage the entire deploy strategy from one place.

1. Your deploy scripts should not be included inside `packages/<package>`: deploy scripts live inside `packages/deploy/`
2. Deploy scripts for any mock contracts live at `deploy/contracts/mock/`
3. The deploy package doesn't use the hardhat config file from the specific package. Instead, it uses `packages/deploy/hardhat.config.ts`
4. You will need to review `packages/deploy/hardhat.config.ts` and update it as needed for any new namedAccounts you added to your package
5. When it comes to deploy time, it is preferred to include deploy scripts and end-to-end tests as a separate PR
6. The named accounts inside the deploy package must use the "real-life" values

INTEGRATION TESTING
1. End-to-end tests live at `packages/deploy/`
2. You must add end-to-end tests ahead of deploying your package. Importantly, these tests should verify deployment and initialization configuration

DOCUMENTATION
XXX

A NOTE ON MAKING PULL REQUESTS
1. Follow the PR template checklist
2. Your PR will not be approved if the above criteria are not met