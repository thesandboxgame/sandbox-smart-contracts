const tap = require('tap');
const assert = require('assert');
const rocketh = require('rocketh');
const {
    sandBeneficiary,
    others,
} = rocketh.namedAccounts;

const {
    gas,
    expectThrow,
    toChecksumAddress,
    deployContract,
    tx,
    encodeCall,
} = require('../utils');

const {
    transfer,
    getERC20Balance,
} = require('../erc20');

const user1 = toChecksumAddress(others[0]);
const user2 = toChecksumAddress(others[1]);

function runERC20BasicApproveExtensionTests(title, resetContract) {
    // console.log('--> ', title);
    tap.test(title, async (t) => {
    // console.log(title);
        let contract;
        t.beforeEach(async () => {
            contract = await resetContract();
            await transfer(contract, user1, '1000000', {from: sandBeneficiary, gas});
        });

        t.test('approveAndCall should fail if method call fails', async () => {
            const ERC20Fund = await deployContract(sandBeneficiary, 'ERC20Fund', contract.options.address);
            const callData = encodeCall(ERC20Fund, 'fail');
            await expectThrow(tx(contract, 'approveAndCall', {from: user1, gas}, ERC20Fund.options.address, 1000, callData));
        });

        t.test('approveAndCall should fail if allowance not enough', async () => {
            const ERC20Fund = await deployContract(sandBeneficiary, 'ERC20Fund', contract.options.address);
            const callData = encodeCall(ERC20Fund, 'take', user1, 10000);
            await expectThrow(tx(contract, 'approveAndCall', {from: user1, gas}, ERC20Fund.options.address, 1000, callData));
        });

        t.test('approveAndCall should fail if passing wrong sender in data', async () => {
            const ERC20Fund = await deployContract(sandBeneficiary, 'ERC20Fund', contract.options.address);
            const callData = encodeCall(ERC20Fund, 'take', user2, 10000);
            await expectThrow(tx(contract, 'approveAndCall', {from: user1, gas}, ERC20Fund.options.address, 10000, callData));
        });

        t.test('approveAndCall should fail if trying to call on behalf of someone else', async () => {
            const ERC20Fund = await deployContract(sandBeneficiary, 'ERC20Fund', contract.options.address);
            const callData = encodeCall(ERC20Fund, 'take', user1, 10000);
            await expectThrow(tx(contract, 'approveAndCall', {from: user2, gas}, ERC20Fund.options.address, 10000, callData));
        });

        t.test('approveAndCall', async () => {
            const ERC20Fund = await deployContract(sandBeneficiary, 'ERC20Fund', contract.options.address);
            const callData = encodeCall(ERC20Fund, 'take', user1, 100);
            await tx(contract, 'approveAndCall', {from: user1, gas}, ERC20Fund.options.address, 1000, callData);
            const user1Balance = await getERC20Balance(contract, user1);
            const ERC20FundBalance = await getERC20Balance(contract, ERC20Fund.options.address);
            assert.equal(ERC20FundBalance.toString(10), '100');
            assert.equal(user1Balance.toString(10), '999900');
        });
    });
}

module.exports = {
    runERC20BasicApproveExtensionTests
};