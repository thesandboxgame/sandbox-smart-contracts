const {guard} = require('../lib');

module.exports = async ({namedAccounts, initialRun, getDeployedContract, deployIfDifferent}) => {
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
        asset.address,
    );

    if (deployResult.newlyDeployed) {
        log(' - TestBouncer deployed at : ' + deployResult.contract.address + ' for gas : ' + deployResult.receipt.gasUsed);
    } else {
        log('reusing TestBouncer at ' + deployResult.contract.address);
    }
};
module.exports.skip = guard(['4', '1', '314159']);

