const rocketh = require('rocketh');
const {getDeployedContract} = require('../../lib');
const {runERC721tests} = require('../erc721_tests');
const {runQuadTreeTests} = require('./quadtree_tests');

const {
    tx,
    gas,
} = require('../utils');

async function deployLand() {
    await rocketh.runStages();
    return getDeployedContract('Land');
}

function ERC721Contract() {
    this.counter = 0;
    this.contract = null;
}
ERC721Contract.prototype.resetContract = async function () {
    this.contract = await deployLand();
    return this.contract;
};
ERC721Contract.prototype.mintERC721 = async function (creator) {
    this.counter++;
    const receipt = await tx(this.contract, 'mintBlock', {from: creator, gas}, creator, 1, this.counter, this.counter); // diagonal
    return receipt.events.Transfer.returnValues._tokenId;
};
// ERC721Contract.prototype.burnERC721 = function (from, tokenId) {
//     this.counter++;
//     return this.contract.methods.burnFrom(from, tokenId, 1).send({from, gas: 3000000});
// };

runERC721tests('Land', new ERC721Contract());
runQuadTreeTests('Land', deployLand);
