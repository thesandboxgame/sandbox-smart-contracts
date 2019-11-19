const rocketh = require('rocketh');
const Web3 = require('web3');
const {
    deployIfDifferent,
    getDeployedContract,
} = require('rocketh-web3')(rocketh, Web3);
const {guard, multiGuards} = require('../lib');

module.exports = async ({namedAccounts, initialRun, isDeploymentChainId}) => {
    function log(...args) {
        if (initialRun) {
            console.log(...args);
        }
    }

    const {
        deployer,
        landAdmin,
    } = namedAccounts;

    const sandContract = getDeployedContract('Sand');
    if (!sandContract) {
        throw new Error('no SAND contract deployed');
    }
    const optimizerRun = rocketh.config && rocketh.config.solcSettings && rocketh.config.solcSettings.optimizer && rocketh.config.solcSettings.optimizer.enabled && rocketh.config.solcSettings.optimizer.runs;
    if (isDeploymentChainId && (!optimizerRun || optimizerRun < 2000)) {
        throw new Error('Land wants to use solc optimized runs >= 2000');
    }
    const deployResult = await deployIfDifferent(['data'],
        'Land',
        {from: deployer, gas: 6000000},
        'Land',
        sandContract.options.address,
        landAdmin,
    );

    if (deployResult.newlyDeployed) {
        log(' - Land deployed at : ' + deployResult.contract.options.address + ' for gas : ' + deployResult.receipt.gasUsed);
    } else {
        log('reusing Land at ' + deployResult.contract.options.address);
    }
};
module.exports.skip = guard(['1', '4'], 'Land');
