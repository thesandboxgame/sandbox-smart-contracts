const t = require('tap');
const {assert} = require('chai');
const rocketh = require('rocketh');
const BN = require('bn.js');

const {getDeployedContract} = require('../../lib');

const {
    deployer,
    others,
    sandAdmin,
    sandSaleBeneficiary,
    // sandBeneficiary,
} = rocketh.namedAccounts;

const daiHolder = deployer;

const {
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

const alice = others[1];
const bob = others[2];
const craig = others[3];

const fakeMedianizerPair = new BN('0000000000000000000000000000000000000000000000094adc6a4ded958000', 16);
const sandUsdPrice = new BN('14400000000000000');

let beforeBalance;
let beforeDAIBalance;

t.test('Normal behavior', async (t) => {
    let medianizer;
    let sand;
    let dai;
    let sandSale;

    t.test('Should get the deployed contracts', async () => {
        medianizer = await getDeployedContract('DAIMedianizer');
        dai = await getDeployedContract('DAI');
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
        assert.equal((new BN(pair.substr(2), 16)).toString(), fakeMedianizerPair.toString(), 'ETHUSD pair is wrong');
    });

    t.test('Should check the amount of SAND for a specific amount of ETH', async () => {
        const ethAmount = '0.1';
        const expectedAmount = (new BN(toWei(ethAmount))).mul(fakeMedianizerPair).div(sandUsdPrice);

        const sandAmount = await sandSale.methods.getSandAmountWithEther(toWei(ethAmount.toString())).call();

        assert.equal(sandAmount.toString(), expectedAmount.toString(), 'Expected amount of SAND with ETH is wrong');
    });

    t.test('Should check if SandSale contract is unpaused', async () => {
        const isPaused = await sandSale.methods.isPaused().call();
        assert.equal(isPaused, false, 'Contract state is wrong');
    });

    t.test('Should buy 0.1 ETH worth of SAND tokens', async () => {
        beforeBalance = new BN(await getBalance(sandSaleBeneficiary));
        await sandSale.methods.buySandWithEther(alice).send({
            from: alice,
            value: toWei('0.1', 'ether'),
            gas,
        });

        const balance = await getERC20Balance(sand, alice);
        const expectedAmount = (new BN(toWei('0.1'))).mul(fakeMedianizerPair).div(sandUsdPrice);
        assert.equal(balance.toString(), expectedAmount.toString(), 'alice SAND balance is wrong');
    });

    t.test('Should find 0.1 ETH in the sandSaleBeneficiary account', async () => {
        const balance = new BN(await getBalance(sandSaleBeneficiary));
        const balanceDiff = balance.sub(beforeBalance);
        assert.equal(fromWei(balanceDiff.toString(10)), '0.1', 'sandSaleBeneficiary acccount ETH balance is wrong');
    });

    t.test('Should check bob DAI balance and send 100 DAI', async () => {
        let balance = await getERC20Balance(dai, bob);
        assert.equal(fromWei(balance.toString()), toWei('0'), 'bob DAI balance is wrong');

        await transfer(dai, bob, toWei('100'), {
            from: daiHolder,
            gas,
        });

        balance = await getERC20Balance(dai, bob);
        assert.equal(balance.toString(), toWei('100'), 'bob DAI balance is wrong');
    });

    t.test('Should buy 20 DAI worth of SAND tokens from bob account', async () => {
        const daiAmount = toWei('20');

        await dai.methods.approve(sandSale.options.address, toWei('100')).send({
            from: bob,
            gas,
        });

        beforeDAIBalance = await getERC20Balance(dai, sandSaleBeneficiary);

        await sandSale.methods.buySandWithDai(
            daiAmount,
            bob,
        ).send({
            from: bob,
            gas,
        });
        const balance = await getERC20Balance(sand, bob);
        const expectedAmount =  new BN(daiAmount).mul(new BN('1000000000000000000')).div(new BN(sandUsdPrice));
        // console.log({
        //     daiAmount: daiAmount.toString(10),
        //     expectedAmount: expectedAmount.toString(10),
        // });
        assert.equal(balance.toString(), expectedAmount.toString(), 'bob SAND balance is wrong');
    });

    t.test('Should find 20 DAI in the sandSaleBeneficiary account balance', async () => {
        const balance = await getERC20Balance(dai, sandSaleBeneficiary);
        const balanceDiff = balance.sub(beforeDAIBalance);
        assert.equal(balanceDiff.toString(10), toWei('20'), 'sandSaleBeneficiary DAI balance is wrong');
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

    t.test('Should unpause the contract', async () => {
        await sandSale.methods.togglePause().send({
            from: sandAdmin,
            gas,
        });

        const isPaused = await sandSale.methods.isPaused().call();
        assert.equal(isPaused, false, 'Contract state is wrong');
    });
});
