const {guard} = require('../lib');

module.exports = async ({namedAccounts, deployments}) => {
    const {deployIfDifferent, log} = deployments;

    const {
        sandBeneficiary,
        deployer,
    } = namedAccounts;

    const deployResult = await deployIfDifferent(['data'],
        'Sand',
        {from: deployer, gas: 3000000},
        'Sand',
        deployer,
        deployer,
        sandBeneficiary
    );

    if (deployResult.newlyDeployed) {
        log(' - Sand deployed at : ' + deployResult.contract.address + ' for gas : ' + deployResult.receipt.gasUsed);
    } else {
        log('reusing Sand at ' + deployResult.contract.address);
    }
};
module.exports.skip = guard(['1', '4', '314159'], 'Sand');
