const tap = require('tap');
const assert = require('assert');
const rocketh = require('rocketh');

const {
    tx,
    call,
    gas,
} = require('../utils');

const {
    sandAdmin,
    others,
} = rocketh.namedAccounts

function runSandTests(title, resetContract) {
    tap.test(title + ' specific tests', async (t)=> {
        let contract;
        t.beforeEach(async () => {
            contract = await resetContract();
        });

        t.test('can initSand after being constructed', async (t) => {
            const newAdminProvided = others[0];
            const oldAdmin = await call(contract, 'admin', {});
            await tx(contract, 'initSand', {from: sandAdmin, gas}, newAdminProvided, newAdminProvided);
            const newAdmin = await call(contract, 'admin', {});
            assert.notEqual(newAdminProvided.toLowerCase(), newAdmin.toLowerCase());
            assert.equal(oldAdmin.toLowerCase(), newAdmin.toLowerCase());
        });
    });
}

module.exports = {
    runSandTests
};
