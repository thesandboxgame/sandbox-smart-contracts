const t = require('tap');
const {assert} = require('chai');
const rocketh = require('rocketh');

const {getDeployedContract} = require('../../lib');

const {
    accounts,
} = rocketh;

const {
    sandAdmin,
    wallet,
} = rocketh.namedAccounts;

const {
    toChecksumAddress,
    toWei,
    fromWei,
    gas,
    getBalance,
    expectThrow,
} = require('../utils');

const {
    transfer,
    getERC20Balance,
} = require('../erc20');

const alice = toChecksumAddress(accounts[1]);
const bob = toChecksumAddress(accounts[2]);
const craig = toChecksumAddress(accounts[3]);

const fakeMedianizerPair = 171.415;
const sandUsdPrice = 0.007;

t.test('Normal behavior', async (t) => {
    let medianizer;
    let sand;
    let dai;
    let sandSale;

    t.test('Should get the deployed contracts', async () => {
        medianizer = await getDeployedContract('FakeMedianizer');
        dai = await getDeployedContract('FakeDai');
        sand = await getDeployedContract('Sand');
        sandSale = await getDeployedContract('SandSale');
    });

    t.test('Should check the address of the SAND token contract in the SandSale contract', async () => {
        const res = await sandSale.methods.sand().call();
        assert.equal(res, sand.options.address, 'SAND token address in SandSale is wrong');
    });

    t.test('Should check the address of the Medianizer contract in the SandSale contract', async () => {
        const res = await sandSale.methods.medianizer().call();
        assert.equal(res, medianizer.options.address, 'Medianizer address in SandSale is wrong');
    });

    t.test('Should check the address of the DAI token contract in the SandSale contract', async () => {
        const res = await sandSale.methods.dai().call();
        assert.equal(res, dai.options.address, 'DAI token address in SandSale is wrong');
    });

    t.test('Should check sandAdmin SAND balance', async () => {
        const balance = await getERC20Balance(sand, sandAdmin);
        assert.equal(balance.toString(), toWei('3000000000'), 'sandAdmin balance is wrong');
    });

    t.test('Should send 500000 SAND to the SandSale contract', async () => {
        await transfer(sand, sandSale.options.address, toWei('500000'), {
            from: sandAdmin,
            gas,
        });

        const balance = await getERC20Balance(sand, sandSale.options.address);
        assert.equal(balance.toString(), toWei('500000'), 'SandSale contract SAND balance is wrong');
    });

    t.test('Should check alice SAND balance', async () => {
        const balance = await getERC20Balance(sand, alice);
        assert.equal(balance.toString(), 0, 'alice balance is wrong');
    });

    t.test('Should check alice ETH balance', async () => {
        const balance = await getBalance(alice);
        assert.equal(balance.toString(), toWei('100'), 'alice balance is wrong');
    });

    t.test('Should check bob SAND balance', async () => {
        const balance = await getERC20Balance(sand, bob);
        assert.equal(balance.toString(), 0, 'bob balance is wrong');
    });

    t.test('Should check bob ETH balance', async () => {
        const balance = await getBalance(bob);
        assert.equal(balance.toString(), toWei('100'), 'bob balance is wrong');
    });

    t.test('Should get the ETHUSD pair', async () => {
        const pair = await medianizer.methods.read().call();
        assert.equal(fromWei(pair), fakeMedianizerPair, 'ETHUSD pair is wrong');
    });

    t.test('Should check the amount of SAND for a specific amount of ETH', async () => {
        const ethAmount = 0.1;
        const expectedAmount = ethAmount * fakeMedianizerPair / sandUsdPrice;

        const sandAmount = await sandSale.methods.getSandAmountWithEther(toWei(ethAmount.toString())).call();

        assert.equal(fromWei(sandAmount.toString()), expectedAmount, 'Expected amount of SAND with ETH is wrong');
    });

    t.test('Should check if SandSale contract is paused', async () => {
        const isPaused = await sandSale.methods.isPaused().call();
        assert.equal(isPaused, true, 'Contract state is wrong');
    });

    t.test('Should unpause the contract', async () => {
        await sandSale.methods.togglePause().send({
            from: sandAdmin,
            gas,
        });

        const isPaused = await sandSale.methods.isPaused().call();
        assert.equal(isPaused, false, 'Contract state is wrong');
    });

    t.test('Should buy 0.1 ETH worth of SAND tokens', async () => {
        await sandSale.methods.buySandWithEther(alice).send({
            from: alice,
            value: toWei('0.1', 'ether'),
            gas,
        });

        const balance = await getERC20Balance(sand, alice);
        const expectedAmount = 0.1 * fakeMedianizerPair / sandUsdPrice;
        assert.equal(fromWei(balance.toString()), expectedAmount, 'alice SAND balance is wrong');
    });

    t.test('Should find 0.1 ETH in the wallet account', async () => {
        const balance = await getBalance(wallet);
        assert.equal(fromWei(balance.toString()), '0.1', 'Wallet acccount ETH balance is wrong');
    });

    t.test('Should check bob DAI balance and send 100 DAI', async () => {
        let balance = await getERC20Balance(dai, bob);
        assert.equal(fromWei(balance.toString()), toWei('0'), 'bob DAI balance is wrong');

        await transfer(dai, bob, toWei('100'), {
            from: sandAdmin,
            gas,
        });

        balance = await getERC20Balance(dai, bob);
        assert.equal(balance.toString(), toWei('100'), 'bob DAI balance is wrong');
    });

    t.test('Should buy 20 DAI worth of SAND tokens from bob account', async () => {
        const daiAmount = 20;

        await dai.methods.approve(sandSale.options.address, toWei('100')).send({
            from: bob,
            gas,
        });

        await sandSale.methods.buySandWithDai(
            toWei(daiAmount.toString()),
            bob,
        ).send({
            from: bob,
            gas,
        });

        const balance = await getERC20Balance(sand, bob);
        const expectedAmount =  daiAmount / sandUsdPrice;
        assert.equal(fromWei(balance.toString()).substring(0, 17), expectedAmount, 'bob SAND balance is wrong');
    });

    t.test('Should find 20 DAI in the Wallet account balance', async () => {
        const balance = await getERC20Balance(dai, wallet);
        assert.equal(balance.toString(), toWei('20'), 'Wallet DAI balance is wrong');
    });

    t.test('Should revert when craig tries to withdraw SAND balance', async () => {
        const sandBalance = await getERC20Balance(sand, sandSale.options.address);

        expectThrow(sandSale.methods.withdrawSand(
            craig,
            sandBalance,
        ).send({
            from: craig,
            gas,
        }));
    });

    t.test('Should withdraw the remaining SAND in the SandSale contract', async () => {
        const sandSaleSandBalance = await getERC20Balance(sand, sandSale.options.address);
        const sandAdminSandBalance = await getERC20Balance(sand, sandAdmin);

        await sandSale.methods.withdrawSand(
            sandAdmin,
            sandSaleSandBalance,
        ).send({
            from: sandAdmin,
            gas,
        });

        const newSandAdminSandBalance = await getERC20Balance(sand, sandAdmin);

        assert.equal(newSandAdminSandBalance.toString(), sandSaleSandBalance.add(sandAdminSandBalance).toString(), 'SandAdmin new SAND balance is wrong');
    });

    t.test('Should not let alice buy more sand', async () => {
        expectThrow(sandSale.methods.buySandWithEther(
            alice,
        ).send({
            from: alice,
            value: toWei('0.1'),
            gas,
        }));
    });

    t.test('Should pause the contract', async () => {
        await sandSale.methods.togglePause().send({
            from: sandAdmin,
            gas,
        });

        const isPaused = await sandSale.methods.isPaused().call();
        assert.equal(isPaused, true, 'Contract state is wrong');
    });

});
