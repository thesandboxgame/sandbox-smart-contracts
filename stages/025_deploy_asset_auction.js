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

    const asset = getDeployedContract('Asset');
    if (!asset) {
        throw new Error('no Asset contract deployed');
    }
    const sandContract = getDeployedContract('Sand');
    if (!sandContract) {
        throw new Error('no SAND contract deployed');
    }

    const deployResult = await deployIfDifferent(['data'],
        'AssetSignedAuction',
        {from: deployer, gas: 2000000},
        'AssetSignedAuction',
        sandContract.options.address,
        asset.options.address
    );
    if (deployResult.newlyDeployed) {
        log(' - AssetSignedAuction deployed at : ' + deployResult.contract.options.address + ' for gas : ' + deployResult.receipt.gasUsed);
    } else {
        log('reusing AssetSignedAuction at ' + deployResult.contract.options.address);
    }
};
module.exports.skip = guard(['1', '4']); // TODO
