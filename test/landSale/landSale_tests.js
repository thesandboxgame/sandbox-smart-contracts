const tap = require('tap');
const rocketh = require('rocketh');
const {assert} = require('chai');
const {getDeployedContract} = require('../../lib');

const {
    balanceOf,
} = require('../erc721');

const {
    tx,
    gas,
    expectThrow,
} = require('../utils');

tap.test('Running LandSale tests', async (t) => {
    let landSale;

    t.beforeEach(async () => {
        await rocketh.runStages();
        landSale = getDeployedContract('LandSale');
    });
});
