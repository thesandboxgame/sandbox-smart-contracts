const assert = require('assert');
const {getDeployedContract} = require('../lib');
const {toChecksumAddress, web3} = require('../test/utils');
const {executeMetaTx, signEIP712MetaTx} = require('../test/sand-utils');
const { generateTokenId } = require('../test/asset-utils');
const { zeroAddress, emptyBytes, encodeCall } = require('../test/utils');
const { transfer } = require('../test/erc20');

const rocketh = require('rocketh');
const rockethWeb3 = require('rocketh-web3')(rocketh, require('web3'));
const {
    tx
} = rockethWeb3;
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
    data:{

    }
    // TODO commit git
};
async function gasTx(name, options, contract, functionName, ...args) {
    const receipt = await tx(options, contract, functionName, ...args);
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

function perNums(perNum, num) {
    const l = [];
    for(let i =0; i < num; i++) {
        l.push(perNum);
    }
    return l;
}

let counter = 0;
function fix(fixedID, batch = 1) {
    if(typeof fixedID == 'undefined') {
        fixedID = counter;
        counter = (counter + batch*8) - (counter%8);
    } else if(fixedID >= counter) {
        counter = fixedID;
        counter = (counter + batch*8) - (counter%8);
    }
    return fixedID;
}
function mintGas(num, fixedID) {
    return gasTx('mint ' + num, {from: creator, gas}, bouncerContract, 'mint', creator, 0, zeroAddress, fix(fixedID), ipfsHashString, num, creator, emptyBytes);
}

function safeBatchTransferFromGas(num, fixedID, packSize) {
    const ids = [];
    const values = [];
    for(let i = 0; i < num; i++) {
        ids.push(generateTokenId(creator, 300, packSize, fixedID, i, 0));
        values.push(200);
    }
    return gasTx('safeBatchTransferFrom ' + num, {from: user1, gas}, assetContract, 'safeBatchTransferFrom', user1, creator, ids, values, emptyBytes);
}


main(accounts);
async function main(accounts) {
    
    // required for the signer to pay for meta-tx
    await transfer(sandContract, signingAccount.address, '1000000000000', {from: sandOwner, gas});
    // to not pay gas when receiving Sand
    await transfer(sandContract, executor, '1', {from: sandOwner, gas});

    await tx({from: creator, gas}, bouncerContract, 'mintMultiple', creator, 0, zeroAddress, 0, ipfsHashString, perNums(300, 1500), user1, emptyBytes);
    await safeBatchTransferFromGas(1000, 0, 1500);
    
    console.log(JSON.stringify(gasReport, null, '  '));
    
}
