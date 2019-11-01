/* eslint-disable camelcase */

const tap = require('tap');
const assert = require('assert');
const Web3 = require('web3');

const MerkleTree = require('../../lib/merkleTree');

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

const testLand = [
    {
        x: 400,
        y: 106,
        size: 1,
        price: '4047'
    },
    {
        x: 399,
        y: 250,
        size: 12,
        price: '2773'
    },
    {
        x: 235,
        y: 144,
        size: 12,
        price: '1358'
    },
    {
        x: 38,
        y: 111,
        size: 6,
        price: '3169'
    },
    {
        x: 308,
        y: 282,
        size: 1,
        price: '8465'
    },
    {
        x: 308,
        y: 282,
        size: 1,
        price: '8465'
    }
];

const bugLand = [
    {
        x: 345,
        y: 294,
        size: 24,
        price: '9735'
    },
    {
        x: 298,
        y: 114,
        size: 3,
        price: '2327'
    },
    {
        x: 286,
        y: 400,
        size: 24,
        price: '5997'
    },
    {
        x: 120,
        y: 199,
        size: 1,
        price: '6223'
    },
    {
        x: 293,
        y: 20,
        size: 3,
        price: '8473'
    },
    {
        x: 52,
        y: 370,
        size: 24,
        price: '4563'
    },
    {
        x: 397,
        y: 10,
        size: 24,
        price: '9571'
    },
    {
        x: 175,
        y: 308,
        size: 24,
        price: '8791'
    },
    {
        x: 90,
        y: 338,
        size: 24,
        price: '3175'
    },
    {
        x: 230,
        y: 299,
        size: 1,
        price: '5318'
    },
    {
        x: 262,
        y: 271,
        size: 24,
        price: '6466'
    }
];

function runMerkleTreeTest() {
    tap.test('Testing the Merkle tree', async (t) => {
        t.test('Should validate the data', async () => {
            for (let i = 8; i < 37; i += 1) {
                const lands = createDummyLands(i);

                const data = createDataArray(lands);
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
