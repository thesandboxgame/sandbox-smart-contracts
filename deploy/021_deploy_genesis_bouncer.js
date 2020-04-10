const {guard} = require('../lib');

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deployIfDifferent, log} = deployments;

    const {
        deployer,
        genesisBouncerAdmin,
        genesisMinter,
    } = await getNamedAccounts();

    const asset = await deployments.get('Asset');
    if (!asset) {
        throw new Error('no Asset contract deployed');
    }

    const deployResult = await deployIfDifferent(['data'],
        'GenesisBouncer',
        {from: deployer, gas: 2000000},
        'GenesisBouncer',
        asset.address,
        genesisBouncerAdmin,
        genesisMinter
    );

    if (deployResult.newlyDeployed) {
        log(' - GenesisBouncer deployed at : ' + deployResult.contract.address + ' for gas : ' + deployResult.receipt.gasUsed);
    } else {
        log('reusing GenesisBouncer at ' + deployResult.contract.address);
    }
};
module.exports.skip = guard(['1', '4', '314159'], 'GenesisBouncer');
