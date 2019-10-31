const rocketh = require('rocketh');
const {getDeployedContract} = require('../../lib');
const {runBundleSandSaleTests} = require('./bundleSandSale_tests');

async function deployBundleSandSale() {
    await rocketh.runStages();
    return getDeployedContract('BundleSandSale');
}

runBundleSandSaleTests('BundleSandSale', deployBundleSandSale);