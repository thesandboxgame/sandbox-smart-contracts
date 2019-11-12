const assert = require('assert');
const {getDeployedContract} = require('../lib');
const {toChecksumAddress, web3} = require('../test/utils');
const {executeMetaTx, signEIP712MetaTx} = require('../test/sand-utils');
const {generateTokenId} = require('../test/asset-utils');
const {zeroAddress, tx, emptyBytes, encodeCall} = require('../test/utils');
const {transfer} = require('../test/erc20');

const rocketh = require('rocketh');
const rockethWeb3 = require('rocketh-web3')(rocketh, require('web3'));
const accounts = rocketh.accounts;

const creator = toChecksumAddress(accounts[0]);
const sandOwner = creator;
const user1 = toChecksumAddress(accounts[1]);
const executor = toChecksumAddress(accounts[5]);
const signingAccount = {
    address: '0xFA8A6079E7B85d1be95B6f6DE1aAE903b6F40c00',
    privateKey: '0xeee5270a5c46e5b92510d70fa4d445a8cdd5010dde5b1fccc6a2bd1a9df8f5c0'
};
const assetContract = getDeployedContract('Asset');
const bouncerContract = getDeployedContract('ORBBouncer');
const sandContract = getDeployedContract('Sand');

const gas = 8000000;

const gasReport = {
    data: {

    }
    // TODO commit git
};
async function gasTx(name, contract, functionName, options, ...args) {
    const receipt = await tx(contract, functionName, options, ...args);
    gasReport.data[name] = receipt.gasUsed;
    return receipt;
}

async function gasUse(name, func) {
    const receipt = await func();
    gasReport.data[name] = receipt.gasUsed;
    return receipt;
}

const ipfsHashString = '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e';
const ipfsUrl = 'ipfs://bafybeidyxh2cyiwdzczgbn4bk6g2gfi6qiamoqogw5bxxl5p6wu57g2ahy';

function timesHex(str, num) {
    let newStr = str;
    for (let i = 1; i < num; i++) {
        newStr += str.slice(2);
    }
    return newStr;
}

function times(str, num) {
    let newStr = str;
    for (let i = 1; i < num; i++) {
        newStr += str;
    }
    return newStr;
}

function lengths(str, num) {
    const l = [];
    for (let i = 0; i < num; i++) {
        l.push(str.length);
    }
    return l;
}

function perNums(perNum, num) {
    const l = [];
    for (let i = 0; i < num; i++) {
        l.push(perNum);
    }
    return l;
}

let counter = 0;
function fix(fixedID, batch = 1) {
    if (typeof fixedID === 'undefined') {
        fixedID = counter;
        counter = (counter + batch * 8) - (counter % 8);
    } else if (fixedID >= counter) {
        counter = fixedID;
        counter = (counter + batch * 8) - (counter % 8);
    }
    return fixedID;
}
function mintGas(num, fixedID) {
    return gasTx('mint ' + num, bouncerContract, 'mint', {from: creator, gas}, creator, 0, zeroAddress, fix(fixedID), ipfsHashString, num, creator, emptyBytes);
}

function mintMultipleGas(num, perNum, fixedID) {
    fixedID = fix(fixedID, Math.floor(num / 8) + 1);
    // console.log({fixedID})
    return gasUse('mintMultiple ' + num, () => bouncerContract.methods.mintMultiple(
        creator,
        0,
        zeroAddress,
        fixedID,
        ipfsHashString,
        perNums(perNum, num),
        creator,
        emptyBytes
    ).send({from: creator, gas}));
}

function mintMultipleNFTsGas(num, fixedID) {
    fixedID = fix(fixedID, Math.floor(num / 8) + 1);
    // console.log({fixedID})
    return gasUse('mintNFTs ' + num, () => bouncerContract.methods.mintMultiple(
        creator,
        0,
        zeroAddress,
        fixedID,
        ipfsHashString,
        perNums(1, num),
        creator,
        emptyBytes
    ).send({from: creator, gas}));
}

async function metaMintGas(num, fixedID) {
    let nonce = await sandContract.methods.meta_nonce(signingAccount.address).call();
    nonce = parseInt(nonce);
    return gasUse('metatx mint ' + num, () => executeMetaTx(signingAccount,
        sandContract,
        {from: executor, gas, gasPrice: 1},
        {nonce: nonce + 1, gasPrice: 1, txGas: 2000000, gasLimit: 2000000 + 112000, tokenGasPrice: 1, relayer: zeroAddress, tokenDeposit: executor},
        bouncerContract,
        0,
        'mint', signingAccount.address, 0, zeroAddress, fix(fixedID), ipfsHashString, num, signingAccount.address, emptyBytes));
}

main(accounts);
async function main(accounts) {
    // required for the signer to pay for meta-tx
    await transfer(sandContract, signingAccount.address, '1000000000000', {from: sandOwner, gas});
    // to not pay gas when receibing Sand
    await transfer(sandContract, executor, '1', {from: sandOwner, gas});

    // await gasUse('fallback', () => rockethWeb3.tx({from: creator, gas, to: assetContract.options.address, data: timesHex(ipfsHashStringHex, 10)}));
    // await gasUse('test', () => tx(assetContract, 'test', {from: creator, gas}, timesHex(ipfsHashStringHex, 10)));

    // await gasUse('fallback fff', () => rockethWeb3.tx({from: creator, gas, to: assetContract.options.address, data: "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"}));
    // await gasUse('test fff', () => tx(assetContract, 'test', {from: creator, gas}, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"));

    // const ffData = timesHex("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", 120);
    // await gasUse('fallback ff * 10', () => rockethWeb3.tx({from: creator, gas, to: assetContract.options.address, data: ffData}));
    // await gasUse('test ff * 10', () => tx(assetContract, 'test', {from: creator, gas}, ffData));

    // const data = encodeCall(assetContract, 'mint', creator, 0, zeroAddress, counter, ipfsHashString, 1, creator, emptyBytes);
    // console.log(data);

    await mintGas(1);
    await mintGas(1000);
    await mintMultipleGas(1, 1000);
    await mintGas(1001);
    await mintMultipleGas(2, 1000);
    await mintMultipleGas(3, 1000);
    await mintMultipleGas(4, 1000);
    await mintMultipleGas(5, 1000);
    await mintMultipleGas(6, 1000);
    await mintMultipleGas(7, 1000);
    await mintMultipleGas(8, 1000);
    await mintMultipleGas(9, 1000);
    await mintMultipleGas(10, 1000);
    await mintMultipleGas(11, 1000);
    await mintMultipleGas(100, 1000);
    await mintMultipleGas(200, 1000);
    await mintMultipleGas(300, 1000);
    await mintMultipleGas(400, 1000);
    await mintMultipleGas(450, 1000);
    await mintMultipleGas(800, 1000);
    await mintMultipleGas(900, 1000);
    await mintMultipleGas(1000, 1000);
    await mintMultipleGas(1200, 1000);
    await mintMultipleGas(1300, 1000);
    await mintMultipleGas(1400, 1000);
    await mintMultipleGas(1500, 1000);
    // await mintMultipleGas(1600, 1000);

    await mintMultipleNFTsGas(1);
    await mintMultipleNFTsGas(2);
    await mintMultipleNFTsGas(3);
    await mintMultipleNFTsGas(4);
    await mintMultipleNFTsGas(5);
    await mintMultipleNFTsGas(6);
    await mintMultipleNFTsGas(7);
    await mintMultipleNFTsGas(8);
    await mintMultipleNFTsGas(9);
    await mintMultipleNFTsGas(10);
    await mintMultipleNFTsGas(100);
    await mintMultipleNFTsGas(300);
    // await mintMultipleNFTsGas(329);

    // TODO reenable with NativeMetaTransactionProcessor
    // await metaMintGas(1000);
    // await metaMintGas(2);

    // Make the node process quit for some reason (happen in web3 lib)
    // await metaMintGas(1);

    // await gasUse('metatx mintMultiple 4', () => executeMetaTx(signingAccount,
    //     sandContract,
    //     {from:executor, gas, gasPrice:1},
    //     {nonce:2, gasPrice:1, txGas: 2000000, gasLimit: 2000000 + 112000, tokenGasPrice:1, relayer: zeroAddress, tokenDeposit: executor},
    //     bouncerContract,
    //     0,
    //     'mintMultiple',
    //     signingAccount.address,
    //     0,
    //     16,
    //     times(ipfsHashString, 4),
    //     lengths(ipfsHashString, 4),
    //     [100,2,5,1000],
    //     creator,
    //     emptyBytes,
    //     ));

    console.log(JSON.stringify(gasReport, null, '  '));
}
