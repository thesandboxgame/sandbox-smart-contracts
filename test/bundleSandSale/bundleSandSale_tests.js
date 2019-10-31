const tap = require('tap');
const assert = require('assert');
const rocketh = require('rocketh');

const {
    tx,
    call,
    gas,
} = require('../utils');

const {
    bundleSandSaleAdmin,
    others,
} = rocketh.namedAccounts;

function runBundleSandSaleTests(title, resetContract) {
    tap.test(title + ' specific tests', async (t)=> {
        let contract;
        t.beforeEach(async () => {
            contract = await resetContract();
        });

        t.todo('can do stuff', async (t) => {
            
        });
    });
}

module.exports = {
    runBundleSandSaleTests
};
