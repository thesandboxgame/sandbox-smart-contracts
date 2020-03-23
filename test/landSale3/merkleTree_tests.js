/* eslint-disable camelcase */

const tap = require('tap');
const assert = require('assert');
const MerkleTree = require('../../lib/merkleTree');
const {createDataArray} = require('../../lib/merkleTreeHelper');

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
    tap.test('Testing the Merkle tree', async (t) => {
        t.test('Should validate the data', async () => {
            for (let i = 8; i < 37; i += 1) {
                const lands = createDummyLands(i);

                const data = createDataArray(lands, 'secret');
                const tree = new MerkleTree(data);

                for (let i = 0; i < data.length; i += 1) {
                    const d = data[i];
                    const proof = tree.getProof(d);
                    const isValid = tree.isDataValid(d, proof);

                    if (!isValid) {
                        console.log('leaf to verify:', d);
                        console.log('Root:', JSON.stringify(tree.getRoot(), (['left', 'right', 'hash']), '  '));
                        console.log('Proof:', proof);
                    }

                    assert.equal(isValid, true, 'Data should be valid');
                }
            }
        });
    });
}

module.exports = {
    runMerkleTreeTest,
};
