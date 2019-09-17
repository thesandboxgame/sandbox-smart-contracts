const Web3 = require('web3');
const rocketh = require('rocketh');
const web3 = new Web3(rocketh.ethereum);
const {deployAndRegister} = require('../lib');

const chainId = rocketh.chainId;
const GenericMetaTransactionInfo = rocketh.contractInfo('GenericMetaTransaction');

module.exports = async ({accounts, registerDeployment}) => {
    if (chainId == 1 || chainId == 4 || chainId == 18) { // TODO remove
        return;
    }
    await deployAndRegister(
        web3,
        accounts,
        registerDeployment,
        'GenericMetaTransaction',
        GenericMetaTransactionInfo
    );
};
