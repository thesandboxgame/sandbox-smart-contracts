const tap = require('tap');
const rocketh = require('rocketh');
const {getDeployedContract} = require('../../lib');

const {
    landSaleAdmin
} = rocketh.namedAccounts;

const {
    tx
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
    this.contractName = 'LandSaleWithETHAndDAI';
    this.type = type;
}
ContractStore.prototype.resetContracts = async function () {
    await rocketh.runStages();
    const contracts = {
        LandSale: getDeployedContract('LandPreSale_1'),
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

// runLandSaleTests('LandPreSale_1', new ContractStore('sand'));
runLandSaleEthTests('LandPreSale_1', new ContractStore('eth'));
// runLandSaleDaiTests('LandPreSale_1', new ContractStore('dai'));
