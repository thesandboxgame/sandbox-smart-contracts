const rocketh = require('rocketh');
const Web3 = require('web3');
const web3 = new Web3(rocketh.ethereum);
const {deployAndRegister, getDeployedContract} = require('../lib');

const chainId = rocketh.chainId;
const LandInfo = rocketh.contractInfo('Land');

module.exports = async ({accounts, registerDeployment}) => {
    if (chainId == 1 || chainId == 4 || chainId == 18) { // TODO remove
        return;
    }
    const sandContract = getDeployedContract('Sand');
    await deployAndRegister(
        web3,
        accounts,
        registerDeployment,
        'Land',
        LandInfo,
        sandContract.options.address
    );
};
