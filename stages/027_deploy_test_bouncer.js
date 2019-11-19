const Web3 = require('web3');
const rocketh = require('rocketh');
const {
    deployIfDifferent,
    getDeployedContract,
} = require('rocketh-web3')(rocketh, Web3);
const {guard, multiGuards} = require('../lib');

module.exports = async ({namedAccounts, initialRun}) => {
    function log(...args) {
        if (initialRun) {
            console.log(...args);
        }
    }

    const {
        deployer,
    } = namedAccounts;

    const asset = getDeployedContract('Asset');
    if (!asset) {
        throw new Error('no Asset contract deployed');
    }

    const deployResult = await deployIfDifferent(['data'],
        'TestBouncer',
        {from: deployer, gas: 1000000},
        'TestBouncer',
        asset.options.address,
    );

    if (deployResult.newlyDeployed) {
        log(' - TestBouncer deployed at : ' + deployResult.contract.options.address + ' for gas : ' + deployResult.receipt.gasUsed);
    } else {
        log('reusing TestBouncer at ' + deployResult.contract.options.address);
    }
};
module.exports.skip = guard(['4', '1']);

