const rocketh = require('rocketh');
const {getDeployedContract} = require('../../lib');
const {mintAndReturnTokenId, mintMultipleAndReturnTokenIds} = require('../asset-utils');

const {runSignedAuctionsTests} = require('./signed_auctions');

async function deployContracts() {
    await rocketh.runStages();
    const deployedContracts = {
        Asset: getDeployedContract('Asset'),
        AssetBouncer: getDeployedContract('ORBBouncer'),
        GenesisBouncer: getDeployedContract('GenesisBouncer'),
        Sand: getDeployedContract('Sand'),
        AssetSignedAuction: getDeployedContract('AssetSignedAuction'),
        NativeMetaTransactionProcessor: getDeployedContract('NativeMetaTransactionProcessor'),
    };
    return deployedContracts;
}

const ipfsHashString = '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e';

function AssetContract() {
    this.counter = 0;
    this.contract = null;
    this.mintContract = null;
}
AssetContract.prototype.resetContract = async function () {
    await rocketh.runStages();
    this.contract = getDeployedContract('Asset');
    this.mintContract = getDeployedContract('ORBBouncer');
    return this.contract;
};

AssetContract.prototype.mintERC1155 = function (creator, amount, ipfsS) {
    this.counter++;
    return mintAndReturnTokenId(this.mintContract, ipfsS || ipfsHashString, amount, creator, this.counter);
};

AssetContract.prototype.mintMultipleERC1155 = function (creator, amounts, ipfsS) {
    this.counter += Math.floor((amounts.length - 1) / 8) + 1;
    return mintMultipleAndReturnTokenIds(this.mintContract, ipfsS || ipfsHashString, amounts, creator, this.counter);
};

function ERC721Contract() {
    this.counter = 0;
    this.contract = null;
    this.mintContract = null;
}
ERC721Contract.prototype.resetContract = async function () {
    await rocketh.runStages();
    this.contract = getDeployedContract('Asset');
    this.mintContract = getDeployedContract('ORBBouncer');
    return this.contract;
};
ERC721Contract.prototype.mintERC721 = function (creator) {
    this.counter++;
    return mintAndReturnTokenId(this.mintContract, ipfsHashString, 1, creator, this.counter);
};
ERC721Contract.prototype.burnERC721 = function (from, tokenId) {
    this.counter++;
    return this.contract.methods.burnFrom(from, tokenId, 1).send({from, gas: 3000000});
};

runSignedAuctionsTests('Asset', deployContracts);
