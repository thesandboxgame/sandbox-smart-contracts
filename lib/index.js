const rocketh = require('rocketh');
const Web3 = require('web3');
const web3 = new Web3(rocketh.ethereum);

async function deploy(web3, accounts, name, info, ...args) {
    const Contract = new web3.eth.Contract(info.abi, {data: '0x' + info.evm.bytecode.object});
    const deployment = Contract.deploy({arguments: args});
    if (!deployment) {
        console.error('cant create a deployment for contract ' + name);
        if (info.evm.bytecode.object == '') {
            console.error('byte code is empty, maybe the Contract is an abstract missing a function to implement');
        }
    }
    const contractPromise = deployment.send({from: accounts[0], gas: 6000000});
    let receipt;
    let transactionHash;
    contractPromise.once('transactionHash', (txHash) => {
        // console.log('transactionHash', txHash);
        transactionHash = txHash;
    });
    contractPromise.once('receipt', (r) => {
        // console.log('receipt', receipt);
        receipt = r;
    });
    const contract = await contractPromise;
    // console.log('contract ' + name + ' deployed at ' + contract.options.address + ' using ' + gasUsed + ' gas');
    return {contract, transactionHash, receipt};
}
async function deployAndRegister(web3, accounts, registerDeployment, name, info, ...args) {
    const {contract, transactionHash} = await deploy(web3, accounts, name, info, ...args);

    registerDeployment(name, {
        contractInfo: info,
        args,
        address: contract.options.address,
        transactionHash
    });
    return {contract, transactionHash};
}

function getDeployedContract(name) {
    const deployment = rocketh.deployment(name);
    if (!deployment) {
        return null;
    }
    return new web3.eth.Contract(deployment.contractInfo ? deployment.contractInfo.abi : [], deployment.address);
}

async function deployViaProxyAndRegister(web3, accounts, registerDeployment, {name, info, proxyName, proxyInfo}, initFunction, ...args) {
    const implementation = await deploy(
        web3,
        accounts,
        name + '_implementation',
        info,
        ...args
    );
    const implementationContract = implementation.contract;

    const initData = implementationContract.methods[initFunction](...args).encodeABI();
    const proxy = await deployAndRegister(
        web3,
        accounts,
        registerDeployment,
        proxyName,
        proxyInfo,
        implementationContract.options.address,
        initData
    );

    const contract = new web3.eth.Contract(
        implementationContract.options.jsonInterface,
        proxy.contract.options.address
    );

    registerDeployment(name, {
        contractInfo: info,
        args,
        address: contract.options.address,
        transactionHash: proxy.transactionHash
    });

    return contract;
}

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
    deployAndRegister,
    deployViaProxyAndRegister,
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
