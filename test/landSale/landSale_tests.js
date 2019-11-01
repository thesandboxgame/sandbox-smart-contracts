const tap = require('tap');
const assert = require('assert');
const rocketh = require('rocketh');

const {
    tx,
    call,
    gas,
    expectThrow,
} = require('../utils');

const {
    sandBeneficiary,
    landSaleAdmin,
    others,
} = rocketh.namedAccounts

const MerkleTree = require('../../lib/merkleTree');
const {createDataArray, calculateLandHash} = require('../../lib/merkleTreeHelper');

function runLandSaleTests(title, contactStore) {
    tap.test(title + ' tests', async (t)=> {
        let contracts;
        let tree;
        let lands;
        let landHashArray;
        t.beforeEach(async () => {
            contracts = await contactStore.resetContracts();
            const deployment = rocketh.deployment('LandSale');
            lands = deployment.data;
            landHashArray = createDataArray(lands);
            tree = new MerkleTree(landHashArray);
            await tx(contracts.Sand, 'transferFrom', {from: sandBeneficiary, gas}, sandBeneficiary, others[0], '1000000000000000000000');
        });

        t.test('non-admin CANNOT togglePause', async (t) => {
            await expectThrow(tx(contracts.LandSale, 'togglePause', {from: others[0], gas}));
        });

        t.test('can togglePause after being constructed', async (t) => {
            await tx(contracts.LandSale, 'togglePause', {from: landSaleAdmin, gas});
            const paused = await call(contracts.LandSale, 'isPaused', {});
            assert.equal(paused, true);
        });

        t.test('can buy Land', async (t) => {
            const proof = tree.getProof(calculateLandHash({
                x: 400,
                y: 106,
                size: 1,
                price: '4047'
            }));
            await tx(contracts.LandSale, 'buyLand', {from: others[0], gas},
                others[0],
                others[0],
                400, 106, 1,
                4047,
                proof
            );
        });

        t.test('CANNOT buy Land when paused', async (t) => {
            await tx(contracts.LandSale, 'togglePause', {from: landSaleAdmin, gas});
            const proof = tree.getProof(calculateLandHash({
                x: 400,
                y: 106,
                size: 1,
                price: '4047'
            }));
            await expectThrow(tx(contracts.LandSale, 'buyLand', {from: others[0], gas},
                others[0],
                others[0],
                400, 106, 1,
                4047,
                proof
            ));
        });

        t.test('CANNOT buy Land twice', async (t) => {
            const proof = tree.getProof(calculateLandHash({
                x: 400,
                y: 106,
                size: 1,
                price: '4047'
            }));
            await tx(contracts.LandSale, 'buyLand', {from: others[0], gas},
                others[0],
                others[0],
                400, 106, 1,
                4047,
                proof
            );
            await expectThrow(tx(contracts.LandSale, 'buyLand', {from: others[0], gas},
                others[0],
                others[0],
                400, 106, 1,
                4047,
                proof
            ));
        });

        t.test('CANNOT generate proof for Land not on sale', async (t) => {
            assert.throws(() => tree.getProof(calculateLandHash({
                x: 400,
                y: 106,
                size: 3,
                price: '4047'
            })));
        });

        t.test('CANNOT buy Land with invalid proof', async (t) => {
            const proof = [
                '0x0000000000000000000000000000000000000000000000000000000000000001',
                '0x0000000000000000000000000000000000000000000000000000000000000002',
                '0x0000000000000000000000000000000000000000000000000000000000000003',
            ];
            await expectThrow(tx(contracts.LandSale, 'buyLand', {from: others[0], gas},
                others[0],
                others[0],
                400, 106, 1,
                4047,
                proof
            ));
        });

        t.test('CANNOT buy Land with wrong proof', async (t) => {
            const proof = tree.getProof(calculateLandHash({
                x: 288,
                y: 144,
                size: 12,
                price: '1358'
            }));
            await expectThrow(tx(contracts.LandSale, 'buyLand', {from: others[0], gas},
                others[0],
                others[0],
                400, 106, 1,
                4047,
                proof
            ));
        });

        t.test('after buying user own all Land bought', async (t) => {
            const proof = tree.getProof(calculateLandHash({
                x: 288,
                y: 144,
                size: 12,
                price: '1358'
            }));
            await tx(contracts.LandSale, 'buyLand', {from: others[0], gas},
                others[0],
                others[0],
                288, 144, 12,
                '1358',
                proof
            );
            for (let x = 288; x < 288 + 12; x++) {
                for (let y = 144; y < 144 + 12; y++) {
                    const owner = await call(contracts.Land, 'ownerOf', null, x + (y * 408));
                    assert.equal(owner, others[0]);
                }
            }
        });

        t.test('can buy all Lands specified in json', async (t) => {
            for (const land of lands) {
                const landHash = calculateLandHash(land);
                const proof = tree.getProof(landHash);
                await tx(contracts.LandSale, 'buyLand', {from: others[0], gas},
                    others[0],
                    others[0],
                    land.x, land.y, land.size,
                    land.price,
                    proof
                );
            }
        });

    });
}

module.exports = {
    runLandSaleTests
};
