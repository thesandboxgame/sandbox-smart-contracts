const {guard} = require('../lib');

module.exports = async ({namedAccounts, initialRun, getDeployedContract, deployIfDifferent, deploy}) => {
    function log(...args) {
        if (initialRun) {
            console.log(...args);
        }
    }

    const {
        deployer,
        bundleSandSaleAdmin,
        bundleSandSaleBeneficiary,
    } = namedAccounts;

    const sand = getDeployedContract('Sand');
    if (!sand) {
        throw new Error('no SAND contract deployed');
    }
    const asset = getDeployedContract('Asset');
    if (!asset) {
        throw new Error('no Asset contract deployed');
    }

    let daiMedianizer = getDeployedContract('DAIMedianizer');
    if (!daiMedianizer) {
        log('setting up a fake DAI medianizer');
        const daiMedianizerDeployResult = await deploy(
            'DAIMedianizer',
            {from: deployer, gas: 6721975},
            'FakeMedianizer',
        );
        daiMedianizer = daiMedianizerDeployResult.contract;
    }

    let dai = getDeployedContract('DAI');
    if (!dai) {
        log('setting up a fake DAI');
        const daiDeployResult = await deploy(
            'DAI', {
                from: deployer,
                gas: 6721975,
            },
            'FakeDai',
        );
        dai = daiDeployResult.contract;
    }

    const bundleSandSaleDeployResult = await deployIfDifferent(['data'],
        'BundleSandSale',
        {from: deployer, gas: 3000000},
        'BundleSandSale',
        sand.address,
        asset.address,
        daiMedianizer.address,
        dai.address,
        bundleSandSaleAdmin,
        bundleSandSaleBeneficiary
    );

    if (bundleSandSaleDeployResult.newlyDeployed) {
        log(' - BundleSandSale deployed at : ' + bundleSandSaleDeployResult.contract.address + ' for gas : ' + bundleSandSaleDeployResult.receipt.gasUsed);
    } else {
        log('reusing BundleSandSale at ' + bundleSandSaleDeployResult.contract.address);
    }
};
module.exports.skip = guard(['1', '4', '314159']); // module.exports.skip = guard(['1', '4'], 'BundleSandSale');
