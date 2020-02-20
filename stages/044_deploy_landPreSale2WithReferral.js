const {getLands} = require('../data/LandPreSale_2/getLands');

module.exports = async ({chainId, namedAccounts, initialRun, deployIfDifferent, isDeploymentChainId, getDeployedContract, deploy}) => {
    function log(...args) {
        if (initialRun) {
            console.log(...args);
        }
    }

    const {
        deployer,
        landSaleAdmin,
        landSaleBeneficiary,
        backendReferralWallet,
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
        'LandPreSale_2_with_referral',
        {from: deployer, gas: 1000000, associatedData: lands},
        'LandSaleWithReferral',
        landContract.address,
        sandContract.address,
        sandContract.address,
        deployer,
        landSaleBeneficiary,
        merkleRootHash,
        1582718400, // 1582718400 converts to Tuesday February 26, 2020 09:00:00 (am) in time zone America/Argentina/Buenos Aires (-03)
        daiMedianizer.address,
        dai.address,
        backendReferralWallet,
        2000,
    );
    const contract = getDeployedContract('LandPreSale_2_with_referral');
    if (deployResult.newlyDeployed) {
        log(' - LandPreSale_2_with_referral deployed at : ' + contract.address + ' for gas : ' + deployResult.receipt.gasUsed);
    } else {
        log('reusing LandPreSale_2_with_referral at ' + contract.address);
    }
};
module.exports.skip = async () => true; //  guard(['1', '4', '314159'], 'LandPreSale_2_with_referral');
