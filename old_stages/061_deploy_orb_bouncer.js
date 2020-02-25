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

    const sandContract = getDeployedContract('Sand');
    if (!sandContract) {
        throw new Error('no SAND contract deployed');
    }
    const asset = getDeployedContract('Asset');
    if (!asset) {
        throw new Error('no Asset contract deployed');
    }

    const deployResult = await deployIfDifferent(['data'],
        'ORBBouncer',
        {from: deployer, gas: 1000000},
        'ORBBouncer',
        sandContract.address,
        asset.address
    );

    if (deployResult.newlyDeployed) {
        log(' - ORBBouncer deployed at : ' + deployResult.contract.address + ' for gas : ' + deployResult.receipt.gasUsed);
    } else {
        log('reusing ORBBouncer at ' + deployResult.contract.address);
    }
};
module.exports.skip = guard(['1', '4', '314159']); // TODO
