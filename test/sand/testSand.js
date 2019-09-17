const {getDeployedContract} = require('../../lib');

const {
    runMetaTxExtensionTests
} = require('./native_meta_transactions');

const {
    runERC20Tests,
} = require('../erc20_tests');

const rocketh = require('rocketh');
const {
    sandBeneficiary,
} = rocketh.namedAccounts;

async function erc20Token() {
    await rocketh.runStages();
    const contracts = {};
    contracts.Sand = getDeployedContract('Sand');
    return contracts.Sand;
}

async function deployMetaTxTokenContracts() {
    await rocketh.runStages();
    return {
        tokenContract: getDeployedContract('Sand'),
        metatxProcessor: getDeployedContract('NativeMetaTransactionProcessor'),
    };
}

runERC20Tests('SAND', erc20Token, {testBurn: true, initialOwner: sandBeneficiary, totalSupply: '3000000000000000000000000000' });
runMetaTxExtensionTests('SAND', deployMetaTxTokenContracts);
