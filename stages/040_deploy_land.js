const rocketh = require('rocketh');
const Web3 = require('web3');
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
        landAdmin,
    } = namedAccounts;

    const sandContract = getDeployedContract('Sand');
    if (!sandContract) {
        throw new Error('no SAND contract deployed');
    }

    const deployResult = await deployIfDifferent(['data'],
        'Land',
        {from: deployer, gas: 8000000},
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
module.exports.skip = guard(['1', '4']); // TODO
