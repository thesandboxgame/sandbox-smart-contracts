const tap = require('tap');
const rocketh = require('rocketh');
const {getDeployedContract} = require('../../lib');

const {
    landSaleAdmin,
} = rocketh.namedAccounts;

const {
    tx,
} = require('../utils');

const {
    runLandSaleTests
} = require('./landSale_tests');

const {
    runLandSaleEthTests,
} = require('./landSale_eth_tests');

const {
    runLandSaleDaiTests,
} = require('./landSale_dai_tests');

function ContractStore(type) {
    this.contractName = 'LandSaleWithReferral';
    this.type = type;
}
ContractStore.prototype.resetContracts = async function () {
    await rocketh.runStages();
    const contracts = {
        LandSale: getDeployedContract('LandPreSale_2'),
        Sand: getDeployedContract('Sand'),
        Land: getDeployedContract('Land'),
        FakeDAI: getDeployedContract('DAI'),
    };

    if (this.type === 'eth') {
        await tx(contracts.LandSale, 'setETHEnabled', {from: landSaleAdmin, gas: 100000}, true);
    } else if (this.type === 'sand') {
        await tx(contracts.LandSale, 'setSANDEnabled', {from: landSaleAdmin, gas: 100000}, true);
    } else if (this.type === 'dai') {
        await tx(contracts.LandSale, 'setDAIEnabled', {from: landSaleAdmin, gas: 100000}, true);
    }
    return contracts;
};

// runLandSaleEthTests('LandPreSale_2', new ContractStore('eth'));
runLandSaleTests('LandPreSale_2', new ContractStore('sand'));
// runLandSaleDaiTests('LandPreSale_2', new ContractStore('dai'));
