/* eslint-disable camelcase */

const assert = require('assert');
const Web3 = require('web3');

const MerkleTree = require('./merkleTree');

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
        value: Web3.utils.toBN(land.price),
    });
}

function createDataArray(lands) {
    const data = [];

    lands.forEach((land) => {
        data.push(calculateLandHash(land));
    });

    return data;
}

function createDummyLands(amount) {
    function getRandomBetween(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }

    const lands = [];
    const sizes = [
        1,
        3,
        6,
        12,
        24,
    ];

    for (let i = 0; i < amount; i += 1) {
        const land = {
            x: getRandomBetween(0, 408),
            y: getRandomBetween(0, 408),
            size: sizes[getRandomBetween(0, sizes.length)],
            price: getRandomBetween(0, 10000).toString(),
        };

        lands.push(land);
    }

    return lands;
}

function runMerkleTreeTest() {
    const lands = createDummyLands(100);
    const data = createDataArray(lands);
    const tree = new MerkleTree(data);

    for (let i = 0; i < data.length; i += 1) {
        const d = data[i];
        const proof = tree.getProof(d);
        const isValid = tree.isDataValid(d, proof);

        assert.equal(isValid, true, 'Data should be valid');
    }
}

module.exports = {
    runMerkleTreeTest,
};
