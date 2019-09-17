const Web3 = require('web3');
const rocketh = require('rocketh');
const {
    fetchIfDifferent,
    deployIfDifferent,
    getDeployedContract,
    tx,
} = require('rocketh-web3')(rocketh, Web3);

const chainId = rocketh.chainId;

const gas = 6000000;

module.exports = async ({namedAccounts, initialRun}) => {
    if (chainId == 1) { // || chainId == 4) { // || chainId == 18) { // TODO remove
        return;
    }

    function log(...args) {
        if (initialRun) {
            console.log(...args);
        }
    }

    const {
        deployer,
    } = namedAccounts;

    const sand = getDeployedContract('Sand');

    const different = await fetchIfDifferent(['data'],
        'NativeMetaTransactionProcessor',
        {from: deployer, gas},
        'NativeMetaTransactionProcessor',
        sand.options.address,
    );

    if (different) {
        await deployIfDifferent(['data'],
            'NativeMetaTransactionProcessor',
            {from: deployer, gas},
            'NativeMetaTransactionProcessor',
            sand.options.address,
        );

        // TODO outside with if checks to make idempotent
        const metaTxProcessor = getDeployedContract('NativeMetaTransactionProcessor');
        await tx({from: deployer, gas}, sand, 'setSuperOperator', metaTxProcessor.options.address, true);
        await tx({from: deployer, gas}, sand, 'setExecutionOperator', metaTxProcessor.options.address, true);
    } else {
        const metaTxProcessor = getDeployedContract('NativeMetaTransactionProcessor');
        log('reusing MetaTxProcessor at ' + metaTxProcessor.options.address);
    }
};
