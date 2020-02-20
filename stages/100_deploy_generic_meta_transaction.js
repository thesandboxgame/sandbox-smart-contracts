const {guard} = require('../lib');

module.exports = async ({namedAccounts, initialRun, deployIfDifferent}) => {
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
        log('GenericMetaTransaction deployed at : ' + deployResult.contract.address + ' for gas : ' + deployResult.receipt.gasUsed);
    } else {
        log('reusing GenericMetaTransaction at ' + deployResult.contract.address);
    }
};
module.exports.skip = guard(['1', '4', '314159']); // TODO
