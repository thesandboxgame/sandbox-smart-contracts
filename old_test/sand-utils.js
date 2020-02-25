const sigUtil = require('eth-sig-util');
const {tx, ethSign, soliditySha3} = require('./utils');

function signEIP712MetaTx(signingAcount, contractAddress, {from, to, amount, data, nonce, minGasPrice, txGas, baseGas, tokenGasPrice, relayer}, use777) {
    const privateKeyAsBuffer = Buffer.from(signingAcount.privateKey.substr(2), 'hex');
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
                    name: 'amount',
                    type: 'uint256'
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
                    name: 'minGasPrice',
                    type: 'uint256'
                },
                {
                    name: 'txGas',
                    type: 'uint256'
                },
                {
                    name: 'baseGas',
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
            ],
            ERC777MetaTransaction: [
                {
                    name: 'from',
                    type: 'address'
                },
                {
                    name: 'to',
                    type: 'address'
                },
                {
                    name: 'amount',
                    type: 'uint256'
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
                    name: 'minGasPrice',
                    type: 'uint256'
                },
                {
                    name: 'txGas',
                    type: 'uint256'
                },
                {
                    name: 'baseGas',
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
        primaryType: use777 ? 'ERC777MetaTransaction' : 'ERC20MetaTransaction',
        domain: {
            name: 'The Sandbox 3D',
            version: '1',
            verifyingContract: contractAddress
        },
        message: {
            from: from || signingAcount.address,
            to,
            amount,
            data,
            nonce,
            minGasPrice,
            txGas,
            baseGas,
            tokenGasPrice,
            relayer
        }
    };
    return sigUtil.signTypedData(privateKeyAsBuffer, {data: data712});
}

function signEIP712Approval(signingAcount, contractAddress, {messageId, target, amount, from}) {
    const privateKeyAsBuffer = Buffer.from(signingAcount.privateKey.substr(2), 'hex');
    const data = {
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
            Approve: [
                {
                    name: 'from',
                    type: 'address'
                },
                {
                    name: 'messageId',
                    type: 'uint256'
                },
                {
                    name: 'target',
                    type: 'address'
                },
                {
                    name: 'amount',
                    type: 'uint256'
                }
            ]
        },
        primaryType: 'Approve',
        domain: {
            name: 'The Sandbox 3D',
            version: '1',
            verifyingContract: contractAddress
        },
        message: {
            from: from || signingAcount.address,
            messageId,
            target,
            amount
        }
    };
    return sigUtil.signTypedData(privateKeyAsBuffer, {data});
}

// function executeNativeMetaTxViaExternalContract(signingAccount, externalContract, options, {fakeSig, from, nonce, gasPrice, txGas, gasLimit, tokenGasPrice, relayer, tokenDeposit, signatureType}, receiver, amount, methodName, ...args) {
//     let callData = '0x';
//     let receiverAddress = receiver;
//     if (typeof receiver !== 'string') {
//         callData = receiver.methods[methodName](...args).encodeABI();
//         receiverAddress = receiver.options.address;
//     }
//     let signature;

//     from = from || signingAccount.address;

//     if (fakeSig) {
//         signature = signEIP712MetaTx(signingAccount, externalContract.options.address, {
//             from,
//             to: receiverAddress,
//             amount,
//             data: callData,
//             nonce,
//             gasPrice: gasPrice + 1,
//             txGas,
//             gasLimit,
//             tokenGasPrice,
//             relayer
//         });
//     } else {
//         signature = signEIP712MetaTx(signingAccount, externalContract.options.address, {
//             from,
//             to: receiverAddress,
//             amount,
//             data: callData,
//             nonce,
//             gasPrice,
//             txGas,
//             gasLimit,
//             tokenGasPrice,
//             relayer
//         });
//     }
//     return tx(externalContract, 'executeERC20MetaTx', options, from, receiverAddress, amount, callData, [nonce, minGasPrice, txGas, baseGas, tokenGasPrice], relayer, signature, tokenDeposit, signatureType ? signatureType : 0);
// }

function executeMetaTx(signingAccount, metatxProcessor, options, {fakeSig, from, nonce, minGasPrice, txGas, baseGas, tokenGasPrice, relayer, tokenDeposit, signatureType, use777}, receiver, amount, methodName, ...args) {
    let callData = '0x';
    let receiverAddress = receiver;
    if (typeof receiver !== 'string') {
        callData = receiver.methods[methodName](...args).encodeABI();
        receiverAddress = receiver.options.address;
    }
    let signature;

    from = from || signingAccount.address;

    if (fakeSig) {
        signature = signEIP712MetaTx(signingAccount, metatxProcessor.options.address, {
            from,
            to: receiverAddress,
            amount,
            data: callData,
            nonce,
            minGasPrice: minGasPrice + 1,
            txGas,
            baseGas,
            tokenGasPrice,
            relayer
        }, use777);
    } else {
        signature = signEIP712MetaTx(signingAccount, metatxProcessor.options.address, {
            from,
            to: receiverAddress,
            amount,
            data: callData,
            nonce,
            minGasPrice,
            txGas,
            baseGas,
            tokenGasPrice,
            relayer
        }, use777);
    }
    return tx(metatxProcessor, use777 ? 'executeERC777MetaTx' : 'executeERC20MetaTx', options, from, receiverAddress, amount, callData, [nonce, minGasPrice, txGas, baseGas, tokenGasPrice], relayer, signature, tokenDeposit, signatureType ? signatureType : 0);
}

async function executeMetaTxViaBasicSignature(signer, tokenContract, options, {fakeSig, from, nonce, minGasPrice, txGas, baseGas, tokenGasPrice, relayer, tokenDeposit, signatureType, use777}, receiver, amount, methodName, ...args) {
    let callData = '0x';
    let receiverAddress = receiver;
    if (typeof receiver !== 'string') {
        callData = receiver.methods[methodName](...args).encodeABI();
        receiverAddress = receiver.options.address;
    }
    const erc20MetaTxTypeHash = soliditySha3({type: 'string', value: 'ERC20MetaTransaction(address from,address to,uint256 amount,bytes data,uint256 nonce,uint256 minGasPrice,uint256 txGas,uint256 baseGas,uint256 tokenGasPrice,address relayer)'});
    const erc777MetaTxTypeHash = soliditySha3({type: 'string', value: 'ERC777MetaTransaction(address from,address to,uint256 amount,bytes data,uint256 nonce,uint256 minGasPrice,uint256 txGas,uint256 baseGas,uint256 tokenGasPrice,address relayer)'});
    let hash;
    if (fakeSig) {
        hash = soliditySha3(
            {type: 'address', value: tokenContract.options.address},
            {type: 'bytes32', value: use777 ? erc777MetaTxTypeHash : erc20MetaTxTypeHash},
            {type: 'address', value: from || signer},
            {type: 'address', value: receiverAddress},
            {type: 'uint256', value: amount},
            // \/ this is required since web util solodySha3 throw on empty bytes (this is the keccak of empty bytes))
            {type: 'bytes32', value: callData == '0x' ? '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470' : soliditySha3({type: 'bytes', value: callData})},
            {type: 'uint256', value: nonce},
            {type: 'uint256', value: minGasPrice + 1},
            {type: 'uint256', value: txGas},
            {type: 'uint256', value: baseGas},
            {type: 'uint256', value: tokenGasPrice},
            {type: 'address', value: relayer},
        );
    } else {
        hash = soliditySha3(
            {type: 'address', value: tokenContract.options.address},
            {type: 'bytes32', value: use777 ? erc777MetaTxTypeHash : erc20MetaTxTypeHash},
            {type: 'address', value: from || signer},
            {type: 'address', value: receiverAddress},
            {type: 'uint256', value: amount},
            // \/ this is required since web util solodySha3 throw on empty bytes (this is the keccak of empty bytes))
            {type: 'bytes32', value: callData == '0x' ? '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470' : soliditySha3({type: 'bytes', value: callData})},
            {type: 'uint256', value: nonce},
            {type: 'uint256', value: minGasPrice},
            {type: 'uint256', value: txGas},
            {type: 'uint256', value: baseGas},
            {type: 'uint256', value: tokenGasPrice},
            {type: 'address', value: relayer},
        );
    }
    const signature = await ethSign(hash, signer);
    return tx(tokenContract, use777 ? 'executeERC777MetaTxViaBasicSignature' : 'executeERC20MetaTxViaBasicSignature', options, from || signer, receiverAddress, amount, callData, [nonce, minGasPrice, txGas, baseGas, tokenGasPrice], relayer, signature, tokenDeposit, signatureType ? signatureType : 0);
}

module.exports = {
    // executePreTransferMetaTx,
    executeMetaTx,
    // executeNativeMetaTxViaExternalContract,
    executeMetaTxViaBasicSignature,
    signEIP712MetaTx,
    signEIP712Approval
};
