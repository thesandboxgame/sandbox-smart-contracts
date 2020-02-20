module.exports = async ({namedAccounts, initialRun, sendTxAndWaitOnlyFrom, getDeployedContract, call}) => {
    function log(...args) {
        if (initialRun) {
            console.log(...args);
        }
    }

    const {
        deployer,
        landSaleAdmin,
    } = namedAccounts;

    const landSaleName = 'LandPreSale_2_with_referral';
    const sand = getDeployedContract('Sand');
    if (!sand) {
        throw new Error('no Sand contract deployed');
    }
    const land = getDeployedContract('Land');
    if (!land) {
        throw new Error('no Land contract deployed');
    }
    const landSale = getDeployedContract(landSaleName);
    if (!landSale) {
        throw new Error('no LandPreSale_2_with_referral contract deployed');
    }

    const isMinter = await call('Land', 'isMinter', landSale.address);
    if (!isMinter) {
        log('setting LandPreSale_2_with_referral as Land minter');
        const currentLandAdmin = await call('Land', 'getAdmin');
        await sendTxAndWaitOnlyFrom(currentLandAdmin, {from: deployer, gas: 1000000, skipError: true}, 'Land', 'setMinter', landSale.address, true);
    }

    const isDAIEnabled = await call(landSaleName, 'isDAIEnabled');
    if (!isDAIEnabled) {
        log('enablingDAI for LandPreSale_2_with_referral');
        const currentLandSaleAdmin = await call(landSaleName, 'getAdmin');
        await sendTxAndWaitOnlyFrom(currentLandSaleAdmin, {from: deployer, gas: 1000000, skipError: true}, landSaleName, 'setDAIEnabled', true);
    }

    const currentAdmin = await call(landSaleName, 'getAdmin');
    if (currentAdmin.toLowerCase() !== landSaleAdmin.toLowerCase()) {
        log('setting LandPreSale_2_with_referral Admin');
        await sendTxAndWaitOnlyFrom(currentAdmin, {from: deployer, gas: 1000000, skipError: true}, landSaleName, 'changeAdmin', landSaleAdmin);
    }

    // TODO if we want to enable SAND
    // const isSandSuperOperator = await call(sand, 'isSuperOperator', landSale.address);
    // if (!isSandSuperOperator) {
    //     log('setting LandPreSale_2_with_referral as super operator for Sand');
    //     const currentSandAdmin = await call(sand, 'getAdmin');
    //     await sendTxAndWaitOnlyFrom(currentSandAdmin, {from: deployer, gas: 100000, skipError: true}, sand, 'setSuperOperator', landSale.address, true);
    // }
};
module.exports.skip = async () => true;
