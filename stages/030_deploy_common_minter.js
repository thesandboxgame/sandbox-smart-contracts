const {guard} = require('../lib');

module.exports = async ({namedAccounts, deployments}) => {
    const {deployIfDifferent, log} = deployments;

    const {
        deployer,
        commonMinterAdmin,
        mintingFeeCollector,
    } = namedAccounts;

    const asset = await deployments.get('Asset');
    if (!asset) {
        throw new Error('no Asset contract deployed');
    }
    const sand = await deployments.get('Sand');
    if (!sand) {
        throw new Error('no Sand contract deployed');
    }

    const deployResult = await deployIfDifferent(['data'],
        'CommonMinter',
        {from: deployer, gas: 2000000},
        'CommonMinter',
        asset.address,
        sand.address,
        '1000000000000000000',
        commonMinterAdmin,
        mintingFeeCollector,
    );

    if (deployResult.newlyDeployed) {
        log(' - CommonMinter deployed at : ' + deployResult.contract.address + ' for gas : ' + deployResult.receipt.gasUsed);
    } else {
        log('reusing CommonMinter at ' + deployResult.contract.address);
    }
};
module.exports.skip = guard(['1', '4', '314159'], 'CommonMinter');

