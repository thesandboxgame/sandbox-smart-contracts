const rocketh = require('rocketh');
const {guard} = require('../lib');

module.exports = async ({namedAccounts, initialRun, isDeploymentChainId, getDeployedContract, deployIfDifferent}) => {
    function log(...args) {
        if (initialRun) {
            console.log(...args);
        }
    }

    const {
        deployer,
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
        sandContract.address,
        deployer, // set_land_admin set it later to correct address
    );

    if (deployResult.newlyDeployed) {
        log(' - Land deployed at : ' + deployResult.contract.address + ' for gas : ' + deployResult.receipt.gasUsed);
    } else {
        log('reusing Land at ' + deployResult.contract.address);
    }
};
module.exports.skip = guard(['1', '4', '314159'], 'Land');
