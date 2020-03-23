const rocketh = require('rocketh');

const ethers = require('ethers');
const provider = new ethers.providers.Web3Provider(rocketh.ethereum);

function getDeployedContract(name) {
    const deployment = rocketh.deployment(name);
    if (!deployment) {
        return null;
    }
    return new ethers.Contract(deployment.address, deployment.contractInfo ? deployment.contractInfo.abi : [], provider);
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
