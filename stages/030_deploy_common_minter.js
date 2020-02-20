const {guard} = require('../lib');

module.exports = async ({namedAccounts, initialRun, getDeployedContract, deployIfDifferent}) => {
    function log(...args) {
        if (initialRun) {
            console.log(...args);
        }
    }

    const {
        deployer,
        commonMinterAdmin,
        mintingFeeCollector,
    } = namedAccounts;

    const asset = getDeployedContract('Asset');
    if (!asset) {
        throw new Error('no Asset contract deployed');
    }
    const sand = getDeployedContract('Sand');
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

