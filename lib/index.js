
// ///////////////////////
const guard = (chainIds, contractName) => {
    const checkContract = Boolean(contractName);
    return async ({deployments}) => {
        const chainId = await deployments.getChainId();
        const matchChainId = (chainIds === chainId || chainIds.indexOf(chainId) >= 0);
        // console.log('match chain id', matchChainId);
        let contract;
        try {
            contract = await deployments.get(contractName);
        } catch (e) {}
        if (matchChainId && (!checkContract || contract)) {
            return true;
        }
    };
};

module.exports = {
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
