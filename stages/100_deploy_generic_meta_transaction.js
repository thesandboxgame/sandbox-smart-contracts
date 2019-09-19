const Web3 = require('web3');
const rocketh = require('rocketh');
const {
    deployIfDifferent,
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

    const deployResult = await deployIfDifferent(['data'],
        'GenericMetaTransaction',
        {from: deployer, gas: 2000000},
        'GenericMetaTransaction',
    );

    if (deployResult.newlyDeployed) {
        log('GenericMetaTransaction deployed at : ' + deployResult.contract.options.address + ' for gas : ' + deployResult.receipt.gasUsed);
    } else {
        log('reusing GenericMetaTransaction at ' + deployResult.contract.options.address);
    }
};
module.exports.skip = guard(['1', '4']);
