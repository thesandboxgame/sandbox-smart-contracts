const {guard} = require('../lib');

module.exports = async ({namedAccounts, deployments}) => {
    const {deployIfDifferent, log} = deployments;

    const {
        deployer,
    } = namedAccounts;

    const sandContract = await deployments.get('Sand');
    if (!sandContract) {
        throw new Error('no SAND contract deployed');
    }
    const deployResult = await deployIfDifferent(['data'],
        'Land',
        {from: deployer, gas: 6000000},
        'Land',
        sandContract.address,
        deployer, // set_land_admin set it later to correct address
    );

    if (deployResult.newlyDeployed) {
        log(' - Land deployed at : ' + deployResult.contract.address + ' for gas : ' + deployResult.receipt.gasUsed);
    } else {
        log('reusing Land at ' + deployResult.contract.address);
    }
};
module.exports.skip = guard(['1', '4', '314159'], 'Land');
