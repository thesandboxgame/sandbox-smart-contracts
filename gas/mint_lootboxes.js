const assert = require('assert');
const BN = require('bn.js');
const {getDeployedContract} = require('../lib');
const {toChecksumAddress, web3} = require('../test/utils');
const {executeMetaTx, signEIP712MetaTx} = require('../test/sand-utils');
const { generateTokenId, getSingleId, getBatchIds } = require('../test/asset-utils');
const { zeroAddress,tx, emptyBytes, encodeCall } = require('../test/utils');
const { transfer } = require('../test/erc20');

const rocketh = require('rocketh');
const rockethWeb3 = require('rocketh-web3')(rocketh, require('web3'));
const accounts = rocketh.accounts;

const {
    deployer,
} = rocketh.namedAccounts;

const user1 = toChecksumAddress(accounts[1]);
const user2 = toChecksumAddress(accounts[2]);
const bouncerContract = getDeployedContract('GenesisBouncer');
const assetContract = getDeployedContract('Asset');

const gas = 8000000;

const gasReport = {
    data:{

    },
    total: 0
    // TODO commit git
};

async function gasUse(name, func) {
    const receipt = await func();
    gasReport.data[name] = receipt.gasUsed;
    gasReport.total += receipt.gasUsed;
    return receipt;
}

const ipfsHashString = '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e';

function perNums(perNum, num) {
    const l = [];
    for (let i = 0; i < num; i++) {
        l.push(perNum);
    }
    return l;
}

function rarities(num) {
    const l = [];
    for (let i = 0; i < num; i++) {
        l.push(0);
    }
    return l;
}

let counter = 0;
function fix(fixedID, batch = 1) {
    if (typeof fixedID === 'undefined') {
        fixedID = counter;
        counter = (counter + (batch * 8)) - (counter % 8);
    } else if (fixedID >= counter) {
        counter = fixedID;
        counter = (counter + (batch * 8)) - (counter % 8);
    }
    return fixedID;
}

function mintMultipleForGas(creator, to, num, perNum, fixedID) {
    fixedID = fix(fixedID, Math.floor(num / 8) + 1);
    // console.log({fixedID});
    // console.log(generateTokenId(creator, perNum, 1, fixedID));
    return gasUse('mintMultiple ' + num, () => bouncerContract.methods.mintMultipleFor(
        creator,
        fixedID,
        ipfsHashString,
        perNums(perNum, num),
        rarities(num),
        to,
    ).send({from: deployer, gas}));
}

main();
async function main() {
    const tokenIds = [];
    const creatorBN = new BN('159f7ec18019dbda9066f5d3edf576aaaaaaaa9b', 16);
    for (let i = 0; i < 180; i++) {
        const creator = '0x' + creatorBN.add(new BN(1)).toString('hex', 40);
        const receipt = await mintMultipleForGas(creator, user1, 1, 10);
        const ts = await getBatchIds(receipt);
        const tokenId = new BN(ts[0]).toString('hex');
        tokenIds.push(tokenId);
        // const balance = await assetContract.methods.balanceOf(user1, tokenId).call();
        // console.log('balance', balance);
        // console.log(JSON.stringify(receipt, null, '  '));
    }
    const transferTokenIds = [];
    const transferBalances = [];
    for (let i = 0; i < 50; i++) {
        transferTokenIds.push(tokenIds[i]);
        transferBalances.push(5);
    }
    const r = await assetContract.methods.safeBatchTransferFrom(
        user1,
        user2,
        transferTokenIds,
        transferBalances,
        emptyBytes,
    ).send({from: user1, gas: 5000000});
    console.log({gasUsed: r.gasUsed});
    console.log(JSON.stringify(gasReport, null, '  '));
}
