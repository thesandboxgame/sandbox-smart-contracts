const tap = require('tap');
const assert = require('assert');
const rocketh = require('rocketh');

const {
    tx,
    call,
    gas,
    expectThrow,
} = require('../utils');

const {
    landSaleAdmin,
    others,
} = rocketh.namedAccounts

function runLandSaleTests(title, contactStore) {
    tap.test(title + ' tests', async (t)=> {
        let contract;
        t.beforeEach(async () => {
            contract = await contactStore.resetContract();
        });

        t.test('non-admin CANNOT togglePause', async (t) => {
            await expectThrow(tx(contract, 'togglePause', {from: others[0], gas}));
        });

        t.test('can togglePause after being constructed', async (t) => {
            await tx(contract, 'togglePause', {from: landSaleAdmin, gas});
            const paused = await call(contract, 'isPaused', {});
            assert.equal(paused, true);
        });

        t.todo('CANNOT buy Land when paused', async (t) => {
            // TODO
        });

        t.todo('can buy all Lands specified in json', async (t) => {
            // TODO
        });

        t.todo('cannot buy Lands not specified in json', async (t) => {
            // TODO
        });
    });
}

module.exports = {
    runLandSaleTests
};
