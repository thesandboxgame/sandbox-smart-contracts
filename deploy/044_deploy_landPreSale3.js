const {guard} = require('../lib');
const {getLands} = require('../data/landPreSale_3/getLands');

const fs = require('fs');
const {calculateLandHash} = require('../lib/merkleTreeHelper');

module.exports = async ({namedAccounts, deployments, network}) => {
    const {deployIfDifferent, deploy, log, getChainId} = deployments;
    const chainId = await getChainId();

    const {
        deployer,
        landSaleBeneficiary,
        backendReferralWallet,
    } = namedAccounts;

    const sandContract = await deployments.get('Sand');
    const landContract = await deployments.get('Land');

    if (!sandContract) {
        throw new Error('no SAND contract deployed');
    }

    if (!landContract) {
        throw new Error('no LAND contract deployed');
    }

    let daiMedianizer = await deployments.get('DAIMedianizer');
    if (!daiMedianizer) {
        log('setting up a fake DAI medianizer');
        const daiMedianizerDeployResult = await deploy(
            'DAIMedianizer',
            {from: deployer, gas: 6721975},
            'FakeMedianizer',
        );
        daiMedianizer = daiMedianizerDeployResult.contract;
    }

    let dai = await deployments.get('DAI');
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

    const {lands, merkleRootHash, saltedLands, tree} = getLands(network.live, chainId);

    const deployResult = await deployIfDifferent(['data'],
        'LandPreSale_3',
        {from: deployer, gas: 1000000, associatedData: lands},
        'LandSaleWithReferral',
        landContract.address,
        sandContract.address,
        sandContract.address,
        deployer,
        landSaleBeneficiary,
        merkleRootHash,
        1586869200, // Tuesday, 14 April 2020 13:00:00 GMT+00:00
        daiMedianizer.address,
        dai.address,
        backendReferralWallet,
        2000,
    );
    const contract = await deployments.get('LandPreSale_3');
    if (deployResult.newlyDeployed) {
        log(' - LandPreSale_3 deployed at : ' + contract.address + ' for gas : ' + deployResult.receipt.gasUsed);
        const landsWithProof = [];
        for (const land of saltedLands) {
            land.proof = tree.getProof(calculateLandHash(land));
            landsWithProof.push(land);
        }
        fs.writeFileSync(`./.presale_3_proofs_${chainId}.json`, JSON.stringify(landsWithProof, null, '  '));
    } else {
        log('reusing LandPreSale_3 at ' + contract.address);
    }
};
module.exports.skip = guard(['1', '4', '314159'], 'LandPreSale_3');
