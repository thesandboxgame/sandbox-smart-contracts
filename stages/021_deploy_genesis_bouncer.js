const {guard} = require('../lib');

module.exports = async ({namedAccounts, initialRun, getDeployedContract, deployIfDifferent}) => {
    function log(...args) {
        if (initialRun) {
            console.log(...args);
        }
    }

    const {
        deployer,
        genesisBouncerAdmin,
        genesisMinter,
    } = namedAccounts;

    const asset = getDeployedContract('Asset');
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
