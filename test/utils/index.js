const ethers = require('ethers');
// ethers.utils.Logger.setLogLevel('off');
const rocketh = require('rocketh');
const {BigNumber, ContractFactory} = ethers;

const ethersProvider = new ethers.providers.Web3Provider(rocketh.ethereum);

async function tx(contract, methodName, options, ...args) {
    if (!args) {
        args = [];
    }
    options = options || {};
    const overrides = {
        value: options.value ? BigNumber.from(options.value) : undefined,
        gasLimit: options.gas ? BigNumber.from(options.gas) : undefined,
        nonce: options.nonce ? BigNumber.from(options.nonce) : undefined,
    };
    args.push(overrides);
    const tx = await contract.connect(ethersProvider.getSigner(options.from)).functions[methodName](...args);
    return tx.wait();
}

async function deployContract(from, contractName, ...args) {
    const contractInfo = rocketh.contractInfo(contractName);
    const contract = new ContractFactory(contractInfo.abi, contractInfo.evm.bytecode.object, ethersProvider.getSigner(from));
    return contract.deploy(...args);
}

async function call(contract, methodName, options, ...args) {
    if (!args) {
        args = [];
    }
    options = options || {};
    const overrides = {
        value: options.value ? BigNumber.from(options.value) : undefined
    };
    args.push(overrides);
    const contractToCall = options.from ? contract.connect(ethersProvider.getSigner(options.from)) : contract;
    const method = contractToCall.callStatic[methodName];
    return method.apply(method, args);
}

async function expectRevert(promise, expectedMessage) {
    if (typeof promise === 'undefined') {
        promise = expectedMessage;
        expectedMessage = null;
    }
    let receipt;
    try {
        receipt = await promise;
    } catch (error) {
        const isExpectedMessagePresent = !expectedMessage || error.message.search(expectedMessage) >= 0;
        if (!isExpectedMessagePresent) {
            throw new Error(`Revert message : "${expectedMessage}" not present`);
        }
        return true;
    }

    if (receipt.status === '0x0') {
        if (expectedMessage) {
            throw new Error(`Revert message not parsed : "${expectedMessage}"`);
        }
        return true;
    }
    // throw new Error(`Revert expected`);
}

let timeDelta = 0;
async function increaseTime(numSec) {
    await ethersProvider.send('evm_increaseTime', [numSec]);
    timeDelta += numSec;
}

module.exports = {
    tx,
    call,
    deployContract,
    expectRevert,
    zeroAddress: '0x0000000000000000000000000000000000000000',
    emptyBytes: '0x',
    ethersProvider,
    getBlockNumber: () => ethersProvider.getBlockNumber(),
    getBalance: (addressOrName) => ethersProvider.getBalance(addressOrName),
    getChainCurrentTime: () => Math.floor(Date.now() / 1000) + timeDelta,
    increaseTime
};
