const tap = require('tap');
const rocketh = require('rocketh');
const {getDeployedContract} = require('../../lib');

const {
    runLandSaleTests
} = require('./landSale_tests');

const {
    runLandSaleEthTests,
} = require('./landSale_eth_tests');

const {
    runLandSaleDaiTests,
} = require('./landSale_dai_tests');

function ContractStore() {
}
ContractStore.prototype.resetContracts = async function () {
    await rocketh.runStages();
    return {
        LandSale: getDeployedContract('LandSale'),
        Sand: getDeployedContract('Sand'),
        Land: getDeployedContract('Land'),
        FakeDAI: getDeployedContract('DAI'),
    };
};

runLandSaleTests('LandSale', new ContractStore());
runLandSaleEthTests('LandSale', new ContractStore());
runLandSaleDaiTests('LandSale', new ContractStore());
