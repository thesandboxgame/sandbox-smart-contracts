const Web3 = require('web3');
const rocketh = require('rocketh');
const {
    deploy,
    deployIfDifferent,
    getDeployedContract,
} = require('rocketh-web3')(rocketh, Web3);
const {guard, multiGuards} = require('../lib');

module.exports = async ({namedAccounts, initialRun}) => {
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
        {from: deployer, gas: 2000000},
        'BundleSandSale',
        sand.options.address,
        asset.options.address,
        daiMedianizer.options.address,
        dai.options.address,
        bundleSandSaleAdmin,
        bundleSandSaleBeneficiary
    );

    if (bundleSandSaleDeployResult.newlyDeployed) {
        log(' - BundleSandSale deployed at : ' + bundleSandSaleDeployResult.contract.options.address + ' for gas : ' + bundleSandSaleDeployResult.receipt.gasUsed);
    } else {
        log('reusing BundleSandSale at ' + bundleSandSaleDeployResult.contract.options.address);
    }
};
module.exports.skip = multiGuards([guard(['4'], 'BundleSandSale'), guard(['1'])]);
