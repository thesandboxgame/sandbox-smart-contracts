const rocketh = require('rocketh');
const {getDeployedContract, } = require('../../lib');
const {mintAndReturnTokenId, mintMultipleAndReturnTokenIds} = require('../asset-utils');

const {runERC721tests} = require('../erc721_tests');
const {runDualERC1155ERC721tests} = require('../dual_erc721_erc1155_tests');
const {runERC1155tests} = require('../erc1155_tests');
const {runAssetTests} = require('./asset_tests');
const {runFixedIDAssetTests} = require('./fixed_id_tests');
const {runERC721ExtractionTests} = require('./erc721_extraction');
const {runSignedAuctionsTests} = require('./signed_auctions');


async function deployContracts() {
    await rocketh.runStages();
    const deployedContracts = {
        Asset: getDeployedContract('Asset'),
        AssetBouncer: getDeployedContract('ORBBouncer'),
        GenesisBouncer: getDeployedContract('GenesisBouncer'),
        Sand: getDeployedContract('Sand'),
        AssetSignedAuction: getDeployedContract('AssetSignedAuction'),
    }    
    return deployedContracts;
}

const ipfsHashString = '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e';
const ipfsUrl = 'ipfs://bafybeidyxh2cyiwdzczgbn4bk6g2gfi6qiamoqogw5bxxl5p6wu57g2ahy';

let counter = 0;
function mint(contract, creator) {
    counter++;
    return mintAndReturnTokenId(contract, ipfsHashString, 1, creator, counter);
}
function mintDual(contract, creator, amount, ipfsS) {
    counter++;
    return mintAndReturnTokenId(contract, ipfsS || ipfsHashString, amount, creator, counter);
}
function mintWithSpecificIPFSHash(contract, ipfsHashString, amount, creator) {
    counter++;
    return mintAndReturnTokenId(contract, ipfsHashString, amount, creator, counter);
}

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

runERC721tests('Asset', new ERC721Contract());
runDualERC1155ERC721tests('Asset', deployContracts, mintDual);
runAssetTests('Asset', deployContracts);
runAssetTests('Asset', deployContracts, 101);
runFixedIDAssetTests('Asset', deployContracts);
runERC1155tests('Asset', new AssetContract());
runERC721ExtractionTests('Asset', deployContracts);
runSignedAuctionsTests('Asset', deployContracts);
