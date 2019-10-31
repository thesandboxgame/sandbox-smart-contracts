const tap = require('tap');
const rocketh = require('rocketh');
const {getDeployedContract} = require('../../lib');

const {
    runMerkleTreeTest,
} = require('./merkleTreeTests');

const {
    balanceOf,
} = require('../erc721');

const {
    tx,
    gas,
    expectThrow,
} = require('../utils');

runMerkleTreeTest();

/*
tap.test('Running LandSale tests', async (t) => {
    let landSale;

    t.beforeEach(async () => {
        await rocketh.runStages();
        landSale = getDeployedContract('LandSale');
    });
});
*/
