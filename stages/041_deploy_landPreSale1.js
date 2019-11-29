const rocketh = require('rocketh');

const Web3 = require('web3');
const {
    deploy,
    getDeployedContract,
} = require('rocketh-web3')(rocketh, Web3);
const {guard} = require('../lib');
const {getLands} = require('../data/getLands');

module.exports = async ({namedAccounts, initialRun, deployIfDifferent, isDeploymentChainId}) => {
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

    const {lands, merkleRootHash} = getLands(isDeploymentChainId);

    const deployResult = await deployIfDifferent(['data'],
        'LandPreSale_1',
        {from: deployer, gas: 1000000, associatedData: lands},
        'LandSale', // TODO rename : LandSaleWithETHAndDAI
        landContract.options.address,
        sandContract.options.address,
        sandContract.options.address,
        landSaleAdmin,
        landSaleBeneficiary,
        merkleRootHash,
        1576753200, // This is Thursday, 19 December 2019 11:00:00 GMT+00:00 // Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
        daiMedianizer.options.address,
        dai.options.address
    );
    const contract = getDeployedContract('LandPreSale_1');
    if (deployResult.newlyDeployed) {
        log(' - LandPreSale_1 deployed at : ' + contract.options.address + ' for gas : ' + deployResult.receipt.gasUsed);
    } else {
        log('reusing LandPreSale_1 at ' + contract.options.address);
    }
};
module.exports.skip = () => true; // module.exports.skip = guard(['1', '4'], 'LandPreSale_1');
