const {guard} = require('../lib');

module.exports = async ({namedAccounts, initialRun, getDeployedContract, deployIfDifferent}) => {
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
        sand.address,
    );

    if (deployResult.newlyDeployed) {
        log(' - NativeMetaTransactionProcessor deployed at : ' + deployResult.contract.address + ' for gas : ' + deployResult.receipt.gasUsed);
    } else {
        log('reusing NativeMetaTransactionProcessor at ' + deployResult.contract.address);
    }
};
module.exports.skip = guard(['1', '4', '314159'], 'NativeMetaTransactionProcessor');
