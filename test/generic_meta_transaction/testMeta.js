const tap = require('tap');
const assert = require('assert');
const sigUtil = require('eth-sig-util');

const {getDeployedContract} = require('../../lib');
const {
    tx,
    gas,
    emptyBytes,
    sendSignedTransaction,
    encodeCall,
    sendTransaction,
    call,
    deployContract,
    getEventsFromReceipt,
    encodeEventSignature,
    expectThrow,
    encodeParameters,
} = require('../utils');

const rocketh = require('rocketh');
const accounts = rocketh.accounts;

const sandOwner = accounts[0];
const user1 = accounts[1];
const user2 = accounts[2];
const relayer = accounts[3];
const relayerFund = accounts[4];
const signingAccount = {
    address: '0xFA8A6079E7B85d1be95B6f6DE1aAE903b6F40c00',
    privateKey: '0xeee5270a5c46e5b92510d70fa4d445a8cdd5010dde5b1fccc6a2bd1a9df8f5c0'
};

async function deployGenericMetaTransaction() {
    await rocketh.runStages();
    return {
        MetaTx: getDeployedContract('GenericMetaTransaction'),
        Sand: getDeployedContract('Sand')
    };
}

function signAndExecuteMetaTransaction(signingAccount, contract, options, {
    from,
    to,
    gasToken,
    data,
    nonce,
    gasPrice,
    txGas,
    gasLimit,
    tokenGasPrice,
    relayer,
    tokenReceiver,
    signedOnBehalf
}) {
    if (!options) {
        options = {};
    }
    if (!options.gas) {
        option.gas = gas;
    }
    options.gasPrice = gasPrice;
    if (!options.from) {
        options.from = relayer;
    }
    if (!gasLimit) {
        gasLimit = 112000 + txGas;
    }

    const signature = signEIP712MetaTx(signingAccount, contract.options.address, {
        from,
        to,
        gasToken,
        data,
        nonce,
        gasPrice,
        txGas,
        gasLimit,
        tokenGasPrice,
        relayer
    });
    return tx(contract, 'executeERC20MetaTx', options,
        from,
        to,
        gasToken,
        data,
        [nonce, gasPrice, txGas, tokenGasPrice],
        relayer,
        signature,
        tokenReceiver,
        signedOnBehalf
    );
}

const ReceivedEvent = encodeEventSignature('Received(address,uint256)');
const MetaTxEvent = encodeEventSignature('MetaTx(bool,bytes)');

function runTests(title, resetContracts) {
    tap.test(title + ' as Meta Transaction Processor', async (t) => {
        let contracts;
        let metaAddress;
        let sandAddress;
        t.beforeEach(async () => {
            contracts = await resetContracts();

            metaAddress = contracts.MetaTx.options.address;

            sandAddress = contracts.Sand.options.address;

            await tx(contracts.Sand, 'transfer', {from: sandOwner, gas}, signingAccount.address, '1000000000000000000000'); // 1000 Sand
            await sendTransaction({from: sandOwner, value: '1000000000000000000', to: signingAccount.address, gas});
            await sendSignedTransaction(encodeCall(contracts.Sand, 'approve', metaAddress, '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'), sandAddress, signingAccount.privateKey);
        });

        t.test('simple receiver', async (t) => {
            let receiverAddress;
            t.beforeEach(async () => {
                contracts.Receiver = await deployContract(sandOwner, 'GenericERC20MetaTxReceiver', metaAddress, sandAddress, 150);
                receiverAddress = contracts.Receiver.options.address;
            });

            t.test('sendToken via meta ', async () => {
                const receipt = await signAndExecuteMetaTransaction(signingAccount, contracts.MetaTx, {from: relayer, gas}, {
                    from: signingAccount.address,
                    to: metaAddress,
                    gasToken: sandAddress,
                    data: encodeCall(contracts.MetaTx, 'sendERC20Tokens', signingAccount.address, user1, sandAddress, '100000000000000000000', emptyBytes),
                    nonce: 1,
                    gasPrice: 1,
                    txGas: 1000000,
                    tokenGasPrice: 1,
                    relayer,
                    tokenReceiver: relayerFund,
                    signedOnBehalf: false
                });

                const metaTxEvents = await getEventsFromReceipt(contracts.MetaTx, MetaTxEvent, receipt);
                assert.equal(metaTxEvents.length, 1);
                assert.equal(metaTxEvents[0].returnValues[0], true);

                const user1SandBalance = await call(contracts.Sand, 'balanceOf', null, user1);
                assert.equal(user1SandBalance, '100000000000000000000', 'user 1 balance checks');
            });

            t.test('execute call with amount via meta tx', async () => {
                const receipt = await signAndExecuteMetaTransaction(signingAccount, contracts.MetaTx, {from: relayer, gas: 6000000}, {
                    from: signingAccount.address,
                    to: metaAddress,
                    gasToken: sandAddress,
                    data: encodeCall(contracts.MetaTx, 'sendERC20Tokens', signingAccount.address, receiverAddress, sandAddress, '150', emptyBytes),
                    nonce: 1,
                    gasPrice: 1,
                    txGas: 1000000,
                    tokenGasPrice: 1,
                    relayer,
                    tokenReceiver: relayerFund,
                    signedOnBehalf: false
                });

                const metaTxEvents = await getEventsFromReceipt(contracts.MetaTx, MetaTxEvent, receipt);
                assert.equal(metaTxEvents.length, 1);
                assert.equal(metaTxEvents[0].returnValues[0], true);

                const receiverEvents = await getEventsFromReceipt(contracts.Receiver, ReceivedEvent, receipt);
                assert.equal(receiverEvents.length, 1);
                assert.equal(receiverEvents[0].returnValues[0], signingAccount.address);

                const receiverSandBalance = await call(contracts.Sand, 'balanceOf', null, receiverAddress);
                assert.equal(receiverSandBalance, 150);
            });

            t.test('execute call without transfer via meta tx', async () => {
                const receipt = await signAndExecuteMetaTransaction(signingAccount, contracts.MetaTx, {from: relayer, gas: 6000000}, {
                    from: signingAccount.address,
                    to: receiverAddress,
                    gasToken: sandAddress,
                    data: encodeParameters(['address', 'uint256'], [signingAccount.address, 0]),
                    nonce: 1,
                    gasPrice: 1,
                    txGas: 1000000,
                    tokenGasPrice: 1,
                    relayer,
                    tokenReceiver: relayerFund,
                    signedOnBehalf: false
                });

                const metaTxEvents = await getEventsFromReceipt(contracts.MetaTx, MetaTxEvent, receipt);
                assert.equal(metaTxEvents.length, 1);
                assert.equal(metaTxEvents[0].returnValues[0], true);

                const receiverEvents = await getEventsFromReceipt(contracts.Receiver, ReceivedEvent, receipt);
                assert.equal(receiverEvents.length, 1);
                assert.equal(receiverEvents[0].returnValues[0], signingAccount.address);

                // console.log(JSON.stringify(receipt, null, '  '));

                const receiverSandBalance = await call(contracts.Sand, 'balanceOf', null, receiverAddress);
                assert.equal(receiverSandBalance, 0);
            });
        });

        t.test('drain receiver', async (t) => {
            let receiverAddress;
            t.beforeEach(async () => {
                contracts.Receiver = await deployContract(sandOwner, 'GasDrain');
                receiverAddress = contracts.Receiver.options.address;
            });

            t.test('passing enough gas for the whole transaction but not enough for the call should throw', async () => {
                // const receipt = await signAndExecuteMetaTransaction(signingAccount, contracts.MetaTx, {from: relayer, gas: 6000000}, {
                //     from: signingAccount.address,
                //     to: receiverAddress,
                //     gasToken: sandAddress,
                //     data: encodeCall(contracts.Receiver, "receiveSpecificERC20", signingAccount.address, 0, 3000000),
                //     nonce: 1,
                //     gasPrice: 1,
                //     txGas: 3000000,
                //     tokenGasPrice: 1,
                //     relayer: relayer,
                //     tokenReceiver: relayerFund,
                //     signedOnBehalf: false
                // });
                // console.log(receipt.gasUsed);

                await expectThrow(signAndExecuteMetaTransaction(signingAccount, contracts.MetaTx, {from: relayer, gas: 3111000}, {
                    from: signingAccount.address,
                    to: receiverAddress,
                    gasToken: sandAddress,
                    data: encodeCall(contracts.Receiver, 'receiveSpecificERC20', signingAccount.address, 0, 3000000),
                    nonce: 1,
                    gasPrice: 1,
                    txGas: 3000000,
                    tokenGasPrice: 1,
                    relayer,
                    tokenReceiver: relayerFund,
                    signedOnBehalf: false
                }));
            });

            t.test('gas use', async () => {
                const txGas = 3000000;
                const receipt = await signAndExecuteMetaTransaction(signingAccount, contracts.MetaTx, {from: relayer, gas: txGas * 2}, {
                    from: signingAccount.address,
                    to: receiverAddress,
                    gasToken: sandAddress,
                    data: encodeCall(contracts.Receiver, 'receiveSpecificERC20', signingAccount.address, 0, txGas),
                    nonce: 1,
                    gasPrice: 1,
                    txGas,
                    tokenGasPrice: 1,
                    relayer,
                    tokenReceiver: relayerFund,
                    signedOnBehalf: false
                });
                // console.log(receipt.gasUsed - txGas);
            });
        });

        t.test('mint', async (t) => {
            let assetAddress;
            t.beforeEach(async () => {
                contracts.Asset = await deployContract(sandOwner, 'Asset', metaAddress);
                assetAddress = contracts.Asset.options.address;

                // to not pay gas for new sand
                await tx(contracts.Sand, 'transfer', {from: sandOwner, gas}, relayerFund, '1000000000000000000000'); // 1000 Sand
            });

            // t.test('minting 1', async () => {

            //     const txGas = 3000000;
            //     const receipt = await signAndExecuteMetaTransaction(signingAccount, contracts.MetaTx, {from: relayer, gas: txGas*2}, {
            //         from: signingAccount.address,
            //         to: assetAddress,
            //         gasToken: sandAddress,
            //         data: encodeCall(contracts.Asset, 'mint', signingAccount.address, 0, zeroAddress, 0, 'ipfs://sdsdsdsaf', 1000, signingAccount.address, emptyBytes),
            //         nonce: 1,
            //         gasPrice: 1,
            //         txGas: txGas,
            //         tokenGasPrice: 1,
            //         relayer: relayer,
            //         tokenReceiver: relayerFund,
            //         signedOnBehalf: false
            //     });

            //     const metaTxEvents = await getEventsFromReceipt(contracts.MetaTx, MetaTxEvent, receipt);
            //     assert.equal(metaTxEvents.length, 1);
            //     assert.equal(metaTxEvents[0].returnValues[0], true);

            //     console.log(receipt.gasUsed);

            // })
        });
    });
}

runTests('GenericMetaTransaction', deployGenericMetaTransaction);

function signEIP712MetaTx(signingAccount, contractAddress, {from, to, gasToken, data, nonce, gasPrice, txGas, gasLimit, tokenGasPrice, relayer}) {
    const privateKeyAsBuffer = Buffer.from(signingAccount.privateKey.substr(2), 'hex');
    const data712 = {
        types: {
            EIP712Domain: [
                {
                    name: 'name',
                    type: 'string'
                },
                {
                    name: 'version',
                    type: 'string'
                },
                {
                    name: 'verifyingContract',
                    type: 'address'
                }
            ],
            ERC20MetaTransaction: [
                {
                    name: 'from',
                    type: 'address'
                },
                {
                    name: 'to',
                    type: 'address'
                },
                {
                    name: 'gasToken',
                    type: 'address'
                },
                {
                    name: 'data',
                    type: 'bytes'
                },
                {
                    name: 'nonce',
                    type: 'uint256'
                },
                {
                    name: 'gasPrice',
                    type: 'uint256'
                },
                {
                    name: 'txGas',
                    type: 'uint256'
                },
                {
                    name: 'gasLimit',
                    type: 'uint256'
                },
                {
                    name: 'tokenGasPrice',
                    type: 'uint256'
                },
                {
                    name: 'relayer',
                    type: 'address'
                }
            ]
        },
        primaryType: 'ERC20MetaTransaction',
        domain: {
            name: 'The Sandbox 3D',
            version: '1',
            verifyingContract: contractAddress
        },
        message: {
            from: from || signingAccount.address,
            to,
            gasToken,
            data,
            nonce,
            gasPrice,
            txGas,
            gasLimit,
            tokenGasPrice,
            relayer
        }
    };
    return sigUtil.signTypedData(privateKeyAsBuffer, {data: data712});
}