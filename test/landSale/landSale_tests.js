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
        t.beforeEach(async () => {
            contracts = await contactStore.resetContracts();
            const deployment = rocketh.deployment('LandSale');
            tree = new MerkleTree(createDataArray(deployment.data));
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

        t.test('CANNOT generate proof for Land not on sale', async (t) => {
            assert.throws(tree.getProof(calculateLandHash({
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
                x: 399,
                y: 250,
                size: 12,
                price: '2773'
            }));
            await expectThrow(tx(contracts.LandSale, 'buyLand', {from: others[0], gas},
                others[0],
                others[0],
                400, 106, 1,
                4047,
                proof
            ));
        });

        t.todo('can buy all Lands specified in json', async (t) => {
            // TODO
        });

        t.todo('cannot buy Lands not specified in json', async (t) => {
            // TODO
        });
    });
}

module.exports = {
    runLandSaleTests
};
