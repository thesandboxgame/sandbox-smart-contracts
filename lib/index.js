const rocketh = require('rocketh');

// TODO remove :
const Web3 = require('web3');
const web3 = new Web3(rocketh.ethereum);

function getDeployedContract(name) {
    const deployment = rocketh.deployment(name);
    if (!deployment) {
        return null;
    }
    return new web3.eth.Contract(deployment.contractInfo ? deployment.contractInfo.abi : [], deployment.address);
}
// ///////////////////////
const guard = (chainIds, contractName) => {
    const checkContract = Boolean(contractName);
    return async ({chainId}) => {
        const matchChainId = (chainIds === chainId || chainIds.indexOf(chainId) >= 0);
        // console.log('match chain id', matchChainId);
        if (matchChainId && (!checkContract || getDeployedContract(contractName))) {
            return true;
        }
    };
};

module.exports = {
    getDeployedContract,
    multiGuards: (guards) => {
        return async (params) => {
            for (const g of guards) {
                const isGuarded = await g(params);
                if (isGuarded) {
                    return true;
                }
            }
            return false;
        };
    },
    guard
};
