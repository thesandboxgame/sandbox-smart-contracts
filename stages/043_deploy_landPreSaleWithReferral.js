const rocketh = require('rocketh');

const Web3 = require('web3');
const {
    deploy,
    getDeployedContract,
} = require('rocketh-web3')(rocketh, Web3);
const {guard} = require('../lib');
const {getLands} = require('../data/getLands');

module.exports = async ({chainId, namedAccounts, initialRun, deployIfDifferent, isDeploymentChainId}) => {
    function log(...args) {
        if (initialRun) {
            console.log(...args);
        }
    }

    const {
        deployer,
        landSaleAdmin,
        landSaleBeneficiary,
    } = namedAccounts;

    const sandContract = getDeployedContract('Sand');
    const landContract = getDeployedContract('Land');

    if (!sandContract) {
        throw new Error('no SAND contract deployed');
    }

    if (!landContract) {
        throw new Error('no LAND contract deployed');
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

    const {lands, merkleRootHash} = getLands(isDeploymentChainId, chainId);

    const deployResult = await deployIfDifferent(['data'],
        'LandPreSale_2',
        {from: deployer, gas: 1000000, associatedData: lands},
        'LandSaleWithReferral',
        landContract.options.address,
        sandContract.options.address,
        sandContract.options.address,
        landSaleAdmin,
        landSaleBeneficiary,
        merkleRootHash,
        15838804800, // This is March 11th 2020 at midnight
        daiMedianizer.options.address,
        dai.options.address,
        landSaleAdmin,
        2000,
    );
    const contract = getDeployedContract('LandPreSale_2');
    if (deployResult.newlyDeployed) {
        log(' - LandPreSale_2 deployed at : ' + contract.options.address + ' for gas : ' + deployResult.receipt.gasUsed);
    } else {
        log('reusing LandPreSale_2 at ' + contract.options.address);
    }
};
module.exports.skip = guard(['1', '4'], 'LandPreSale_2');
