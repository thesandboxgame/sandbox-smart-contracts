module.exports = async ({chainId, namedAccounts, initialRun, deployIfDifferent, isDeploymentChainId, getDeployedContract, deploy}) => {
    function log(...args) {
        if (initialRun) {
            console.log(...args);
        }
    }

    const {
        deployer,
        P2PERC721SaleAdmin,
    } = namedAccounts;

    const sandContract = getDeployedContract('Sand');

    if (!sandContract) {
        throw new Error('no SAND contract deployed');
    }

    await deploy(
        'TestERC721', {
            from: deployer,
            gas: 6721975,
        },
        'TestERC721',
        sandContract.address,
        P2PERC721SaleAdmin,
    );

    await deployIfDifferent(['data'],
        'P2PERC721Sale',
        {from: deployer, gas: 6721975},
        'P2PERC721Sale',
        sandContract.address,
        P2PERC721SaleAdmin,
        P2PERC721SaleAdmin,
        10000,
    );
};
module.exports.skip = async () => true; //  guard(['1', '4', '314159'], 'LandPreSale_2_with_referral');
