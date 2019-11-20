const Web3 = require('web3');
const rocketh = require('rocketh');
const {
    txOnlyFrom,
    getDeployedContract,
    call,
} = require('rocketh-web3')(rocketh, Web3);
// const {guard} = require('../lib');

module.exports = async ({namedAccounts, initialRun}) => {
    function log(...args) {
        if (initialRun) {
            console.log(...args);
        }
    }

    const {
        deployer,
    } = namedAccounts;

    const sand = getDeployedContract('Sand');
    if (!sand) {
        throw new Error('no Sand contract deployed');
    }
    const land = getDeployedContract('Land');
    if (!land) {
        throw new Error('no Land contract deployed');
    }
    const landSale = getDeployedContract('LandSale');
    if (!landSale) {
        throw new Error('no LandSale contract deployed');
    }

    const isMinter = await call(land, 'isMinter', landSale.options.address);
    if (!isMinter) {
        log('setting LandSale as Land minter');
        const currentLandAdmin = await call(land, 'getAdmin');
        await txOnlyFrom(currentLandAdmin, {from: deployer, gas: 1000000}, land, 'setMinter', landSale.options.address, true);
    }

    const isSandSuperOperator = await call(sand, 'isSuperOperator', landSale.options.address);
    if (!isSandSuperOperator) {
        log('setting LandSale as super operator for Sand');
        const currentSandAdmin = await call(sand, 'getAdmin');
        await txOnlyFrom(currentSandAdmin, {from: deployer, gas: 100000}, sand, 'setSuperOperator', landSale.options.address, true);
    }
};
