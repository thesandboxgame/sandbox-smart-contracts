const {guard} = require('../lib');
const {getLands} = require('../data/LandPreSale_2/getLands');

module.exports = async ({chainId, namedAccounts, initialRun, deployIfDifferent, isDeploymentChainId, getDeployedContract, deploy}) => {
    function log(...args) {
        if (initialRun) {
            console.log(...args);
        }
    }

    const {
        deployer,
        estateAdmin,
    } = namedAccounts;

    const sandContract = getDeployedContract('Sand');
    const landContract = getDeployedContract('Land');

    if (!sandContract) {
        throw new Error('no SAND contract deployed');
    }

    if (!landContract) {
        throw new Error('no LAND contract deployed');
    }

    const deployResult = await deployIfDifferent(['data'],
        'Estate',
        {from: deployer, gas: 1000000},
        'Estate',
        sandContract.address,
        estateAdmin,
        landContract.address
    );
    const contract = getDeployedContract('Estate');
    if (deployResult.newlyDeployed) {
        log(' - Estate deployed at : ' + contract.address + ' for gas : ' + deployResult.receipt.gasUsed);
    } else {
        log('reusing Estate at ' + contract.address);
    }
};
module.exports.skip = guard(['1', '4', '314159']); // TODO , 'Estate');
