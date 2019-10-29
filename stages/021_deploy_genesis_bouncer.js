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
        genesisBouncerAdmin,
        genesisMinter,
    } = namedAccounts;

    const asset = getDeployedContract('Asset');
    if (!asset) {
        throw new Error('no Asset contract deployed');
    }

    const deployResult = await deployIfDifferent(['data'],
        'GenesisBouncer',
        {from: deployer, gas: 1000000},
        'GenesisBouncer',
        asset.options.address,
        genesisBouncerAdmin,
        genesisMinter
    );

    if (deployResult.newlyDeployed) {
        log(' - GenesisBouncer deployed at : ' + deployResult.contract.options.address + ' for gas : ' + deployResult.receipt.gasUsed);
    } else {
        log('reusing GenesisBouncer at ' + deployResult.contract.options.address);
    }
};
module.exports.skip = guard(['1', '4'], 'GenesisBouncer');
