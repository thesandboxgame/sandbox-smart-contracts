const tap = require('tap');
const rocketh = require('rocketh');
const {getDeployedContract} = require('../../lib');

const {
    runLandSaleTests
} = require('./landSale_tests');

function ContractStore() {
}
ContractStore.prototype.resetContracts = async function () {
    await rocketh.runStages();
    return {
        LandSale: getDeployedContract('LandPreSale_1'),
        Sand: getDeployedContract('Sand'),
        Land: getDeployedContract('Land'),
    };
};

runLandSaleTests('LandPreSale_1', new ContractStore());
