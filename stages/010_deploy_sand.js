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
        sandAdmin,
        sandBeneficiary,
        deployer,
    } = namedAccounts;

    const deployResult = await deployIfDifferent(['data'],
        'Sand',
        {from: deployer, gas: 2000000},
        'Sand',
        sandAdmin,
        sandAdmin,
        sandBeneficiary
    );

    if (deployResult.newlyDeployed) {
        log(' - Sand deployed at : ' + deployResult.contract.options.address + ' for gas : ' + deployResult.receipt.gasUsed);
    } else {
        log('reusing Sand at ' + deployResult.contract.options.address);
    }
};
module.exports.skip = guard(['1', '4'], 'Sand');
