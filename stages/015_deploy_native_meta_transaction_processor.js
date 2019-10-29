const Web3 = require('web3');
const rocketh = require('rocketh');
const {
    deployIfDifferent,
    getDeployedContract,
} = require('rocketh-web3')(rocketh, Web3);
const {guard} = require('../lib');

module.exports = async ({namedAccounts, initialRun}) => {
    function log(...args) {
        if (initialRun) {
            console.log(...args);
        }
    }

    const {
        deployer,
    } = namedAccounts;

    const sand = getDeployedContract('Sand');
    if (!sand) {
        throw new Error('no SAND contract deployed');
    }

    const deployResult = await deployIfDifferent(['data'],
        'NativeMetaTransactionProcessor',
        {from: deployer, gas: 2000000},
        'NativeMetaTransactionProcessor',
        sand.options.address,
    );

    if (deployResult.newlyDeployed) {
        log(' - NativeMetaTransactionProcessor deployed at : ' + deployResult.contract.options.address + ' for gas : ' + deployResult.receipt.gasUsed);
    } else {
        log('reusing NativeMetaTransactionProcessor at ' + deployResult.contract.options.address);
    }
};
module.exports.skip = guard(['1', '4'], 'NativeMetaTransactionProcessor');
