const {guard} = require('../lib');

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deployIfDifferent, log} = deployments;

    const {
        deployer,
        estateAdmin,
    } = await getNamedAccounts();

    const sandContract = await deployments.get('Sand');
    const landContract = await deployments.get('Land');

    if (!sandContract) {
        throw new Error('no SAND contract deployed');
    }

    if (!landContract) {
        throw new Error('no LAND contract deployed');
    }

    const deployResult = await deployIfDifferent(['data'],
        'Estate',
        {from: deployer, gas: 6000000},
        'Estate',
        sandContract.address,
        estateAdmin,
        landContract.address
    );
    const contract = await deployments.get('Estate');
    if (deployResult.newlyDeployed) {
        log(' - Estate deployed at : ' + contract.address + ' for gas : ' + deployResult.receipt.gasUsed);
    } else {
        log('reusing Estate at ' + contract.address);
    }
};
module.exports.skip = guard(['1', '4', '314159']); // TODO , 'Estate');
module.exports.tags = ['Estate'];
module.exports.dependencies = ['Sand', 'Land'];