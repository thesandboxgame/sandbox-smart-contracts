const tap = require('tap');
const assert = require('assert');
const BN = require('bn.js');
const rocketh = require('rocketh');

const {
    gas,
    expectThrow,
    getEventsFromReceipt,
    getPastEvents,
    toChecksumAddress,
    zeroAddress,
} = require('./utils');

const {
    ApproveEvent,
    transfer,
    transferFrom,
    getERC20Balance,
    getERC20Allowance,
    burn,
    approve,
    TransferEvent,
} = require('./erc20');

const {
    others,
} = rocketh.namedAccounts;

const user1 = toChecksumAddress(others[0]);
const user2 = toChecksumAddress(others[1]);
const operator = toChecksumAddress(others[2]);

function runERC20Tests(title, resetContract, {initialOwner, totalSupply, testBurn}) {
    tap.test(title + ' as ERC20', async (t) => {
        const initialBalance = totalSupply >= 1000000 ? '1000000' : totalSupply;
        let contract;
        t.beforeEach(async () => {
            contract = await resetContract();
            await transfer(contract, user1, initialBalance, {from: initialOwner, gas});
        });

        t.test('deploy should emit Transfer event', async () => {
            const contract = await resetContract();
            const events = await getPastEvents(contract, TransferEvent);
            assert.equal(events[0].returnValues[0], '0x0000000000000000000000000000000000000000');
            assert.equal(events[0].returnValues[1], initialOwner);
            assert.equal(events[0].returnValues[2], totalSupply);
        });

        t.test('transfering from user1 to user2 should adjust their balance accordingly', async () => {
            await transfer(contract, user2, '1000', {from: user1, gas});
            const user1Balance = await getERC20Balance(contract, user1);
            const user2Balance = await getERC20Balance(contract, user2);
            assert.equal(user2Balance.toString(10), '1000');
            assert.equal(user1Balance.toString(10), new BN(initialBalance).sub(new BN('1000')).toString(10));
        });

        t.test('transfering from user1 more token that it owns should fails', async () => {
            await expectThrow(transfer(contract, user2, new BN(initialBalance).add(new BN('1000')).toString(10), {from: user1, gas}));
        });

        t.test('transfering to address zero should fails', async () => {
            await expectThrow(transfer(contract, zeroAddress, '1000', {from: user1, gas}));
        });

        t.test('transfering to address zero should fails', async () => {
            await expectThrow(transfer(contract, zeroAddress, '1000', {from: user1, gas}));
        });

        t.test('transfering from user1 to user2 by user1 should adjust their balance accordingly', async () => {
            await transferFrom(contract, user1, user2, '1000', {from: user1, gas});
            const user1Balance = await getERC20Balance(contract, user1);
            const user2Balance = await getERC20Balance(contract, user2);
            assert.equal(user2Balance.toString(10), '1000');
            assert.equal(user1Balance.toString(10), new BN(initialBalance).sub(new BN('1000')).toString(10));
        });

        t.test('transfering from user1 by user2 should fails', async () => {
            await expectThrow(transferFrom(contract, user1, user2, '1000', {from: user2, gas}));
        });

        t.test('transfering from user1 to user2 should trigger a transfer event', async () => {
            const receipt = await transfer(contract, user2, '1000', {from: user1, gas});
            const events = await getEventsFromReceipt(contract, TransferEvent, receipt);
            assert.equal(events[0].returnValues[0], user1);
            assert.equal(events[0].returnValues[1], user2);
            assert.equal(events[0].returnValues[2], '1000');
        });

        t.test('transfering from user1 to user2 by operator after approval, should adjust their balance accordingly', async () => {
            await approve(contract, operator, '1000', {from: user1, gas});
            await transferFrom(contract, user1, user2, '1000', {from: operator, gas});
            const user1Balance = await getERC20Balance(contract, user1);
            const user2Balance = await getERC20Balance(contract, user2);
            assert.equal(user2Balance.toString(10), '1000');
            assert.equal(user1Balance.toString(10), new BN(initialBalance).sub(new BN('1000')).toString(10));
        });
        t.test('transfering from user1 to user2 by operator after approval and approval reset, should fail', async () => {
            await approve(contract, operator, '1000', {from: user1, gas});
            await approve(contract, operator, '0', {from: user1, gas});
            await expectThrow(transferFrom(contract, user1, user2, '1000', {from: operator, gas}));
        });
        t.test('transfering from user1 to user2 by operator after approval, should adjust the operator alowance accordingly', async () => {
            await approve(contract, operator, '1010', {from: user1, gas});
            await transferFrom(contract, user1, user2, '1000', {from: operator, gas});
            const allowance = await getERC20Allowance(contract, user1, operator);
            assert.equal(allowance.toString(10), '10');
        });
        t.test('transfering from user1 to user2 by operator after max approval (2**256-1), should NOT adjust the operator allowance', async () => {
            await approve(contract, operator, '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', {from: user1, gas});
            await transferFrom(contract, user1, user2, '1000', {from: operator, gas});
            const allowance = await getERC20Allowance(contract, user1, operator);
            assert.equal(allowance.toString('hex'), 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
        });
        t.test('transfering from user1 to user2 by operator after approval, but without enough allowance, should fails', async () => {
            await approve(contract, operator, '1010', {from: user1, gas});
            await expectThrow(transferFrom(contract, user1, user2, '2000000', {from: operator, gas}));
        });
        t.test('transfering from user1 by operators without pre-approval should fails', async () => {
            await expectThrow(transferFrom(contract, user1, user2, '1000', {from: operator, gas}));
        });
        t.test('approving operator should trigger a Approval event', async () => {
            const receipt = await approve(contract, operator, '1000', {from: user1, gas});
            const events = await getEventsFromReceipt(contract, ApproveEvent, receipt);
            assert.equal(events[0].returnValues[2], '1000');
        });
        t.test('disapproving operator (allowance to zero) should trigger a Approval event', async () => {
            const receipt = await approve(contract, operator, '0', {from: user1, gas});
            const events = await getEventsFromReceipt(contract, ApproveEvent, receipt);
            assert.equal(events[0].returnValues[2], '0');
        });

        t.test('approve to address zero should fails', async () => {
            await expectThrow(approve(contract, zeroAddress, '1000', {from: user1, gas}));
        });

        if (testBurn) {
            t.test('burn', async (t) => {
                t.test('burn should emit erc20 transfer event to zero address', async () => {
                    const receipt = await burn(contract, '1000', {from: user1, gas});
                    const events = await getEventsFromReceipt(contract, TransferEvent, receipt);
                    assert.equal(events[0].returnValues[0], user1);
                    assert.equal(events[0].returnValues[1], '0x0000000000000000000000000000000000000000');
                    assert.equal(events[0].returnValues[2], '1000');
                });

                t.test('burning more token that a user owns should fails', async () => {
                    await expectThrow(burn(contract, '2000000', {from: user1, gas}));
                });
            });
        }
    });
}

module.exports = {
    runERC20Tests,
};
