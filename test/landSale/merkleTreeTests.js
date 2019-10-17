/* eslint-disable camelcase */

const Web3 = require('web3');

const MerkleTree = require('./merkleTree');
const landsJson = require('./landsToSale.json');

function calculateLandHash(land) {
    return Web3.utils.soliditySha3({
        type: 'uint16',
        value: land.x,
    }, {
        type: 'uint16',
        value: land.y,
    }, {
        type: 'uint16',
        value: land.size,
    }, {
        type: 'uint256',
        value: Web3.utils.toBN(land.sandPrice),
    }, {
        type: 'uint256',
        value: Web3.utils.toBN(land.ethPrice),
    });
}

function createDataArray(lands) {
    const data = [];

    lands.forEach((land) => {
        data.push(calculateLandHash(land));
    });

    return data;
}

const landsMerkleTree = new MerkleTree(createDataArray(landsJson));

const depth = landsMerkleTree.getDepth();
console.log('Depth:', depth);

const root = landsMerkleTree.getRoot();
console.log('Root:', root);
