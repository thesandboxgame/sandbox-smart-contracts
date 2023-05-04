---
breaks: false

description: Writing tests

---

# The tools we use

- [Hardhat](https://hardhat.org/tutorial/): The framework used to run a special Evm used for testing called
  hardhat-network. Read this specific section: [Testing-contracts](https://hardhat.org/tutorial/testing-contracts.html)
- [ethers-js](https://docs.ethers.io/v5/): A framework used to access the hardhat-network from javascript/typescript and
  abstract the contracts, so they can be easily called.
- [Mocha](https://mochajs.org/): The testing framework, you can declare test suites, individual tests and get a report
  after running them.
- [Chai](https://www.chaijs.com/): Helpers to make assertions about results inside the tests.
- [Waffle chai matchers](https://ethereum-waffle.readthedocs.io/en/latest/matchers.html): Some extra chai helpers
  specific to the blockchain.
- [Hardhat deploy](https://hardhat.org/guides/deploying.html): A framework that lets you run deploy scripts when you run
  your tests, take snapshots of the hardhat-network and revert to those snapshots when needed.

# Running the tests

There are two different ways to execute the tests and that can generate some confusion because the configuration used by
each method is different. The two methods are the following:

1. Hardhat executes mocha: there is a hardhat task that executes mocha and uses the options declared in the mocha
   section of the `hardhat-config.ts` file.
2. Mocha executes hardhat: mocha is executed (in vscode for example) and when the hardhat library is required an
   hardhat-network is run. In this case the configuration is taken from the file `.mocharc.js`

In our project two methods are configured. You can run a single test from your editor in which case the method 2 is
used, or you can run all the tests by executing `yarn test` in the project root directory in which case the method 1 is
used.

## A simple test

Check the typical test in: [Testing-contracts](https://hardhat.org/tutorial/testing-contracts.html)

Each test file can contain some related tests, and you can have a lot of files (or test suites) that test different
contracts.

Something very important to note is that: ***the hardhat-network keeps the state between tests***, so taking that into
account each test suite must do a clean deployment of the contracts used or revert the known hardhat-network state.

## Testing with snapshots

Hardhat deploy provides two methods of taking snapshots of the hardhat-network state:

1. The function `fixture` takes a list of migration script tags. The migration scripts are executed and a snapshot is
   taken after that. The same snapshot is reused when the function is called with the same list of tags.
2. `createFixture` is a high order function, it takes a function as argument and return another a function. The first
   time the returned function is called it executes the given function and takes snapshot of the resulting
   hardhat-network state. After that when the function is called again it reverts to the snapshot.

Those two methods can be used to control the initial state of the hardhat-network on each test and test suite. They had
some side effects that must be taken into account:

1. If some set of deployment scripts are executed by a test suite (by calling `fixture(['SOME_DEPLOY_STEP'])`) and then
   another suite uses the exact same set, the second suite will get the snapshot taken by the first one, and it can
   produce an unexpected behaviour.
2. If the function `createFixture` is used twice in the same test suite the first call get the initial state of the
   hardhat-network plus the initialization done by the `createFixture` and the second one get both. After that a call to
   any of those will erase the changes done by the other one.
3. The calls: `fixture()` and `fixture([])` ***are very different!***. The first one executes all the migration steps
   and the second one don't execute any. The first version is specially problematic, a test that was working can fail
   because of a broken deploy-step added for a completely unrelated set of contracts.

To avoid errors and make the code cleaner we introduce: `withSnapshot(migrationSteps, function)`. This function must be
called to create a setup function that then is called in each test. The setup function revert to the initial state of
the hardhat-network ([see: initial state](https://hardhat.org/hardhat-network/reference/#initial-state), executes the
given migrations, the given function and then save a snapshot of the hardhat-network state. When called later the
function does nothing but reverting to the snapshot previously taken. ***You can declare as many setup functions you
want but must use only one in each test***.

## Recommended style for tests

For the tests we recommend using `withSnapshot` that takes the following arguments:

1. A list of migration script tags.
2. An async function to execute.

and does the following:

1. reverts the hardhat-network to his initial state
2. calls `fixture` with the list of migration tags. The default is an empty list, so `fixture(undefined)` is never used
3. calls `createFixture` with the given function

This way all the calls to `fixture` and `createFixture` are over a clean hardhat-network state and can be reused with no
risks. 

***Never use `fixture` or `createFixture` outside `withSnapshot` to avoid any unexpected behaviour*** 

### `withSnapshot` usage example

```typescript

// This function can be in some util.ts file or anoter reusable piece. 
// IS BETTER TO REUSE this kind of functions instead of migration steps when doing unit tests!!!
async function IWillReuseThisInSomeSetup() {
    const [user1, user2] = await getUnnamedAccounts();
    const {deployer, otherUser} = await getNamedAccounts();
    // Do some extra deploys set values, etc.
    await deployments.deploy('CHILD_CHAIN_MANAGER', {from: deployer});
    await deployments.deploy('MOCK1', {from: deployer});
    // ... 
    const contract = await ethers.getContract('CHILD_CHAIN_MANAGER');
    // We can call contract methods to setup values, etc.
    return {contract, user1, user2, otherUser, deployer, etc};
}

async function IWillReuseThisInSomeSetup2() {
// ...
    return {someOtherContract, etc};
}

// A typical setup function
const setup1 = withSnapshot([
    'MIGRATION1',
    'MIGRATION2',
    //...
], IWillReuseThisInSomeSetup);

// Another setup function that mix some results
const setup2 = withSnapshot([
    'MIGRATION1',
    'OTHER_MIGRATION_MIGRATION2',
    // ...
], async () => {
    const vals1 = await IWillReuseThisInSomeSetup();
    const vals2 = await IWillReuseThisInSomeSetup1();
    return {...vals1, ...vals2}
});

const setup3 = withSnapshot([
    'MIGRATION1',
    'MIGRATION2',
    // ...
], async function () {
    // If we don't want to reuse the async func we can write it here directly.
    return {something}
});

// withSnapshot can be used without migration steps
const setup4 = withSnapshot([], async function () {
    // If we don't want to reuse the async func we can write it here directly.
    return {something}
});

describe('Will test some contract', function () {
    it("should do something", async function () {
        const {contract, user1} = await setup1();
        const ret = await contract.someMethod(user1);
        // Chai and waffle matchers are very usefull!!!
        expect(await token.balanceOf(wallet.address)).to.equal(993);
        expect(BigNumber.from(100)).to.be.within(BigNumber.from(99), BigNumber.from(101));
        expect(BigNumber.from(100)).to.be.closeTo(BigNumber.from(101), 10);
        await expect(token.transfer(walletTo.address, 7))
            .to.emit(token, 'Transfer')
            .withArgs(wallet.address, walletTo.address, 7);
        await expect(token.transfer(walletTo.address, 1007))
            .to.be.revertedWith('Insufficient funds');
        // ...
    });
    it("should fail to do something", async function () {
        // Here the snapshot taken by setup1 is reused.
        const {contract, user1} = await setup1();
        // ...
    })
    it("should do something with different setup", async function () {
        const {contract, contract2, user2} = await setup2();
        // ...
    })
    it("THIS IS WRONG, DON'T USE TWO SETUPS IN ONE TEST!!!", async function () {
        const {contract} = await setup1();
        const {contract2} = await setup2();
    })
    it("THIS IS RISKY, WE GET THE HARDHAT-NETWORK STATE THAT THE PREVIOUS TEST LEAVE US!!!", async function () {
    })
});

```

- ***It is recommended to reuse the async function passed to withSnapshot instead of writing migration steps that are
  only used for testing***
- In general when doing unit-tests we don't need to run migration steps. Running migration steps is useful when doing
  integration tests and when testing migration steps directly.
- You can nest as many describe blocks as you want.



