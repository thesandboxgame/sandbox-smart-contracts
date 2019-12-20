const rocketh = require('rocketh');
const Web3 = require('web3');
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
        'ReferralValidator',
        {from: deployer, gas: 6000000},
        'ReferralValidator',
        deployer,
    );

    if (deployResult.newlyDeployed) {
        log(' - ReferralValidator deployed at : ' + deployResult.contract.options.address + ' for gas : ' + deployResult.receipt.gasUsed);
    } else {
        log('reusing ReferralValidator at ' + deployResult.contract.options.address);
    }
};
module.exports.skip = guard(['1', '4'], 'ReferralValidator');
