const crypto = require('crypto');
const tap = require('tap');
const assert = require('assert');
const rocketh = require('rocketh');
const {getDeployedContract} = require('../../lib');
const {
    tx,
    gas,
    encodeCall,
    deployContract,
    getEventsFromReceipt,
    encodeEventSignature,
} = require('../utils');

const accounts = rocketh.accounts;
const deployer = accounts[0];
const executor = accounts[1];

const receivingAddress = '0xFA8A6079E7B85d1be95B6f6DE1aAE903b6F40c00';
const amount = 150;

function generateBytes(length) {
    return '0x' + crypto.randomBytes(length).toString('hex');
}

async function isSuccess(contract, receipt) {
    const events = await getEventsFromReceipt(contract, encodeEventSignature('Tx(bool,bytes,uint256)'), receipt);
    return events.length == 1 && events[0].returnValues[0] == true;
}

async function gasUsedForCallExecution(contract, receipt) {
    const events = await getEventsFromReceipt(contract, encodeEventSignature('Tx(bool,bytes,uint256)'), receipt);
    return events.length == 1 ? parseInt(events[0].returnValues[2]) : -1;
}

function runTests({func, epsilon, log}) {
    tap.test('gasTest with ' + func + (typeof epsilon !== 'undefined' ? ' and epsilon = ' + epsilon : ''), async (t) => {
        // t.runOnly = true;

        let GasDrain;
        let GasTest;
        let receiver;
        t.beforeEach(async () => {
            GasDrain = await deployContract(deployer, 'GasDrain');
            GasTest = await deployContract(deployer, 'GasTest');
            receiver = GasDrain.options.address;
        });

        function exec(gasProvided, txGas, callData) {
            if (typeof epsilon !== 'undefined') {
                return tx(GasTest, 'test', {from: executor, gas: gasProvided}, epsilon, txGas, receiver, callData);
            }
            return tx(GasTest, func, {from: executor, gas: gasProvided}, txGas, receiver, callData);
        }

        // t.test('drain with 3000000', async () => {
        //     const txGas = 3000000;
        //     const gasProvided = txGas*2;
        //     const callData = encodeCall(GasDrain, 'receive', txGas);
        //     const receipt = await exec(gasProvided, txGas, callData);
        //     // console.log(JSON.stringify(receipt, null, "  "));
        //     assert(await isSuccess(GasTest, receipt));
        //     if(log) {
        //         console.log('drain with 3000000' + JSON.stringify({func, epsilon}))
        //         console.log('gasUsed : ' + (receipt.gasUsed));
        //         console.log('gas left : ' + (gasProvided - receipt.gasUsed));
        //         console.log('extra gas : ' + (receipt.gasUsed - txGas));
        //         console.log('gas used for exec : ' + await gasUsedForCallExecution(GasTest, receipt));
        //     }
        // });

        // t.test('drain with 100000', async () => {
        //     const txGas = 100000;
        //     const gasProvided = txGas*2;
        //     const callData = encodeCall(GasDrain, 'receive', txGas);
        //     const receipt = await exec(gasProvided, txGas, callData);
        //     // console.log(JSON.stringify(receipt, null, "  "));
        //     assert(await isSuccess(GasTest, receipt));
        //     if(log) {
        //         console.log('drain with 100000'+ JSON.stringify({func, epsilon}))
        //         console.log('gasUsed : ' + (receipt.gasUsed));
        //         console.log('gas left : ' + (gasProvided - receipt.gasUsed));
        //         console.log('extra gas : ' + (receipt.gasUsed - txGas));
        //         console.log('gas used for exec : ' + await gasUsedForCallExecution(GasTest, receipt));
        //     }
        // });

        // t.test('drain 3000000 with 10 bytes data', async () => {
        //     const txGas = 3000000;
        //     const gasProvided = txGas*2;
        //     const numBytes = 10;
        //     const callData = encodeCall(GasDrain, 'receiveWithData', txGas, generateBytes(numBytes));
        //     const receipt = await exec(gasProvided, txGas, callData);
        //     // console.log(JSON.stringify(receipt, null, "  "));
        //     assert(await isSuccess(GasTest, receipt));
        //     if(log) {
        //         console.log('drain 3000000 with 10 bytes data' + JSON.stringify({func, epsilon}))
        //         console.log('gasUsed : ' + (receipt.gasUsed));
        //         console.log('gas left : ' + (gasProvided - receipt.gasUsed));
        //         console.log('extra gas : ' + (receipt.gasUsed - txGas));
        //         console.log('gas used for exec : ' + await gasUsedForCallExecution(GasTest, receipt));
        //     }
        // });

        // t.test('drain 2000000 with 10 bytes data', async () => {
        //     const txGas = 2000000;
        //     const gasProvided = txGas*2;
        //     const numBytes = 10;
        //     const callData = encodeCall(GasDrain, 'receiveWithData', txGas, generateBytes(numBytes));
        //     const receipt = await exec(gasProvided, txGas, callData);
        //     // console.log(JSON.stringify(receipt, null, "  "));
        //     assert(await isSuccess(GasTest, receipt));
        //     if(log) {
        //         console.log('drain 2000000 with 10 bytes data' + JSON.stringify({func, epsilon}))
        //         console.log('gasUsed : ' + (receipt.gasUsed));
        //         console.log('gas left : ' + (gasProvided - receipt.gasUsed));
        //         console.log('extra gas : ' + (receipt.gasUsed - txGas));
        //         console.log('gas used for exec : ' + await gasUsedForCallExecution(GasTest, receipt));
        //     }
        // });

        // t.test('drain 3000000 with 10000 bytes data', async () => {
        //     const txGas = 3000000;
        //     const gasProvided = txGas*2;
        //     const numBytes = 10000;
        //     const callData = encodeCall(GasDrain, 'receiveWithData', txGas, generateBytes(numBytes));
        //     const receipt = await exec(gasProvided, txGas, callData);
        //     // console.log(JSON.stringify(receipt, null, "  "));
        //     assert(await isSuccess(GasTest, receipt));
        //     if(log) {
        //         console.log('drain 3000000 with 10000 bytes data' + JSON.stringify({func, epsilon}))
        //         console.log('gasUsed : ' + (receipt.gasUsed));
        //         console.log('gas left : ' + (gasProvided - receipt.gasUsed));
        //         console.log('extra gas : ' + (receipt.gasUsed - txGas));
        //         console.log('gas used for exec : ' + await gasUsedForCallExecution(GasTest, receipt));
        //     }
        // });

        t.test('drain 3000000 via receiveSpecificERC20', async () => {
            const txGas = 3000000;
            const gasProvided = txGas * 2;
            const callData = encodeCall(GasDrain, 'receiveSpecificERC20', receivingAddress, amount, txGas);
            const receipt = await exec(gasProvided, txGas, callData);
            // console.log(JSON.stringify(receipt, null, "  "));
            assert(await isSuccess(GasTest, receipt));
            if (log) {
                console.log('drain 3000000 via receiveSpecificERC20' + JSON.stringify({func, epsilon}));
                console.log('gasUsed : ' + (receipt.gasUsed));
                console.log('gas left : ' + (gasProvided - receipt.gasUsed));
                console.log('extra gas : ' + (receipt.gasUsed - txGas));
                console.log('gas used for exec : ' + await gasUsedForCallExecution(GasTest, receipt));
            }
        });

        // t.test('drain 2000000 via receiveSpecificERC20', async () => {
        //     const txGas = 2000000;
        //     const gasProvided = txGas*2;
        //     const callData = encodeCall(GasDrain, 'receiveSpecificERC20', receivingAddress, amount, txGas);
        //     const receipt = await exec(gasProvided, txGas, callData);
        //     // console.log(JSON.stringify(receipt, null, "  "));
        //     assert(await isSuccess(GasTest, receipt));
        //     if(log) {
        //         console.log('drain 2000000 via receiveSpecificERC20' + JSON.stringify({func, epsilon}))
        //         console.log('gasUsed : ' + (receipt.gasUsed));
        //         console.log('gas left : ' + (gasProvided - receipt.gasUsed));
        //         console.log('extra gas : ' + (receipt.gasUsed - txGas));
        //         console.log('gas used for exec : ' + await gasUsedForCallExecution(GasTest, receipt));
        //     }
        // });

        t.test('drain 5000000 via receiveSpecificERC20', async () => {
            const txGas = 5000000;
            const gasProvided = 5900000;
            const callData = encodeCall(GasDrain, 'receiveSpecificERC20', receivingAddress, amount, txGas);
            const receipt = await exec(gasProvided, txGas, callData);
            // console.log(JSON.stringify(receipt, null, "  "));
            assert(await isSuccess(GasTest, receipt));
            if (log) {
                console.log('drain 5000000 via receiveSpecificERC20' + JSON.stringify({func, epsilon}));
                console.log('gasUsed : ' + (receipt.gasUsed));
                console.log('gas left : ' + (gasProvided - receipt.gasUsed));
                console.log('extra gas : ' + (receipt.gasUsed - txGas));
                console.log('gas used for exec : ' + await gasUsedForCallExecution(GasTest, receipt));
            }
        });
    });
}

runTests({
    func: 'raw',
    // log:true,
});

runTests({
    func: 'test',
    epsilon: 1,
    // log:true,
});

runTests({
    func: 'test',
    // log:true,
});
