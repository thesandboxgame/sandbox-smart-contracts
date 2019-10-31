const tap = require('tap');
const rocketh = require('rocketh');
const {getDeployedContract} = require('../../lib');

const {
    runMerkleTreeTest,
} = require('./merkleTreeTests');

const {
    runLandSaleTests
} = require('./landSale_tests');

const {
    balanceOf,
} = require('../erc721');

const {
    tx,
    gas,
    expectThrow,
} = require('../utils');

function LandSaleContract() {
    this.contract = null;
}
LandSaleContract.prototype.resetContract = async function () {
    await rocketh.runStages();
    this.contract = getDeployedContract('LandSale');
    return this.contract;
};

runLandSaleTests('LandSale', new LandSaleContract());
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
