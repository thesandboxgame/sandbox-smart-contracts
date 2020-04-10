module.exports = async ({deployments}) => {
    const {call, sendTxAndWait, log} = deployments;

    const sand = await deployments.get('Sand');
    if (!sand) {
        throw new Error('no Sand contract deployed');
    }
    const land = await deployments.get('Land');
    if (!land) {
        throw new Error('no Land contract deployed');
    }
    const landSale = await deployments.get('LandPreSale_1');
    if (!landSale) {
        throw new Error('no LandPreSale_1 contract deployed');
    }

    const isMinter = await call('Land', 'isMinter', landSale.address);
    if (!isMinter) {
        log('setting LandPreSale_1 as Land minter');
        const currentLandAdmin = await call('Land', 'getAdmin');
        await sendTxAndWait({from: currentLandAdmin, gas: 1000000, skipError: true}, 'Land', 'setMinter', landSale.address, true);
    }

    // TODO if we want to enable SAND
    // const isSandSuperOperator = await call(sand, 'isSuperOperator', landSale.address);
    // if (!isSandSuperOperator) {
    //     log('setting LandPreSale_1 as super operator for Sand');
    //     const currentSandAdmin = await call(sand, 'getAdmin');
    //     await txOnlyFrom(currentSandAdmin, {from: deployer, gas: 100000}, sand, 'setSuperOperator', landSale.address, true);
    // }
};
