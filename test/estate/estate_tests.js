const ethers = require('ethers');
const {BigNumber} = ethers;
const tap = require('tap');
const assert = require('assert');
const rocketh = require('rocketh');

const {
    expectRevert,
    tx,
    zeroAddress,
    emptyBytes,
    call,
} = require('../utils');

const {
    namedAccounts,
} = rocketh;

const {
    others,
} = namedAccounts;

const user0 = others[0];
const user1 = others[1];
const user2 = others[2];
const user3 = others[3];

function runEstateTests({contractsStore}) {
    tap.test('Estate testing', async (t) => {
        let contracts;
        t.beforeEach(async () => {
            contracts = await contractsStore.resetContracts();
        });

        function selectQuads(landQuads, indices) {
            const xs = [];
            const ys = [];
            const sizes = [];
            const selection = [];
            for (const index of indices) {
                const landQuad = landQuads[index];
                xs.push(landQuad.x);
                ys.push(landQuad.y);
                sizes.push(landQuad.size);
                selection.push(landQuad);
            }
            return {xs, ys, sizes, selection};
        }

        function assignIds(landQuads) {
            for (const landQuad of landQuads) {
                landQuad.topCornerId = landQuad.x + (landQuad.y * 408);
            }
            return landQuads;
        }

        async function createQuads(to, landSpecs) {
            for (const landSpec of landSpecs) {
                await contracts.LandFromMinter.functions.mintQuad(to, landSpec.size, landSpec.x, landSpec.y, emptyBytes).then((tx) => tx.wait());
            }
        }

        t.test('creating from Land Quad', async (t) => {
            const size = 6;
            const x = 6;
            const y = 12;
            await contracts.LandFromMinter.functions.mintQuad(user0, size, x, y, emptyBytes).then((tx) => tx.wait());
            await contracts.Estate.connect(contracts.Estate.provider.getSigner(user0)).functions.createFromQuad(user0, user0, size, x, y).then((tx) => tx.wait());
            for (let sx = 0; sx < size; sx++) {
                for (let sy = 0; sy < size; sy++) {
                    const id = x + sx + ((y + sy) * 408);
                    const landOwner = await contracts.Land.callStatic.ownerOf(id);
                    assert.equal(landOwner, contracts.Estate.address);
                }
            }
            const estateOwner = await contracts.Estate.callStatic.ownerOf(1);
            assert.equal(estateOwner, user0);
        });

        t.test('creating from Lands with junctions', async (t) => {
            const size = 6;
            const x = 6;
            const y = 12;
            await contracts.LandFromMinter.functions.mintQuad(user0, size, x, y, emptyBytes).then((tx) => tx.wait());
            const landIds = [];
            const junctions = [];
            for (let sx = 0; sx < size; sx++) {
                for (let sy = 0; sy < size; sy++) {
                    landIds.push(x + sx + ((y + sy) * 408));
                }
                junctions.push(sx * size);
            }

            await contracts.Estate.connect(contracts.Estate.provider.getSigner(user0)).functions.createFromMultipleLands(user0, user0, landIds, junctions).then((tx) => tx.wait());
            for (let sx = 0; sx < size; sx++) {
                for (let sy = 0; sy < size; sy++) {
                    const id = x + sx + ((y + sy) * 408);
                    const landOwner = await contracts.Land.callStatic.ownerOf(id);
                    assert.equal(landOwner, contracts.Estate.address);
                }
            }
            const estateOwner = await contracts.Estate.callStatic.ownerOf(1);
            assert.equal(estateOwner, user0);
        });

        t.test('creating from multiple quads', async (t) => {
            const landQuads = assignIds([
                {x: 5, y: 7, size: 1},
                {x: 6, y: 8, size: 1},
                {x: 6, y: 9, size: 3},
                {x: 6, y: 12, size: 3},
                {x: 180, y: 24, size: 12},
                {x: 42, y: 48, size: 6},
                {x: 9, y: 15, size: 3},
            ]);
            await createQuads(user0, landQuads);
            const {xs, ys, sizes, selection} = selectQuads(landQuads, [1, 2, 3]);
            const junctions = [];
            await contracts.Estate.connect(contracts.Estate.provider.getSigner(user0)).functions.createFromMultipleQuads(user0, user0, sizes, xs, ys, junctions).then((tx) => tx.wait());
            for (const landQuad of selection) {
                for (let sx = 0; sx < landQuad.size; sx++) {
                    for (let sy = 0; sy < landQuad.size; sy++) {
                        const id = landQuad.x + sx + ((landQuad.y + sy) * 408);
                        const landOwner = await contracts.Land.callStatic.ownerOf(id);
                        assert.equal(landOwner, contracts.Estate.address);
                    }
                }
            }
            const estateOwner = await contracts.Estate.callStatic.ownerOf(1);
            assert.equal(estateOwner, user0);
        });

        t.test('creating from multiple quads fails if not connected', async (t) => {
            const landQuads = assignIds([
                {x: 5, y: 7, size: 1},
                {x: 6, y: 8, size: 1},
                {x: 6, y: 9, size: 3},
                {x: 6, y: 12, size: 3},
                {x: 180, y: 24, size: 12},
                {x: 42, y: 48, size: 6},
                {x: 9, y: 15, size: 3},
            ]);
            await createQuads(user0, landQuads);
            const {xs, ys, sizes, selection} = selectQuads(landQuads, [1, 2, 3, 4]);
            const junctions = [];
            await expectRevert(contracts.Estate.connect(contracts.Estate.provider.getSigner(user0)).functions.createFromMultipleQuads(user0, user0, sizes, xs, ys, junctions).then((tx) => tx.wait()), 'JUNCTIONS_MISSING');
        });

        t.test('creating from multiple quads with junctions', async (t) => {
            const landQuads = assignIds([
                {x: 5, y: 7, size: 1},
                {x: 6, y: 8, size: 1},
                {x: 6, y: 9, size: 3},
                {x: 6, y: 12, size: 3},
                {x: 3, y: 9, size: 3},
                {x: 180, y: 24, size: 12},
                {x: 42, y: 48, size: 6},
                {x: 9, y: 15, size: 3},
            ]);
            await createQuads(user0, landQuads);
            const {xs, ys, sizes, selection} = selectQuads(landQuads, [1, 2, 3, 4]);
            const junctions = [1];
            await contracts.Estate.connect(contracts.Estate.provider.getSigner(user0)).functions.createFromMultipleQuads(user0, user0, sizes, xs, ys, junctions).then((tx) => tx.wait());
        });

        t.test('creating from multiple quads without junctions fails', async (t) => {
            const landQuads = assignIds([
                {x: 5, y: 7, size: 1},
                {x: 6, y: 8, size: 1},
                {x: 6, y: 9, size: 3},
                {x: 6, y: 12, size: 3},
                {x: 3, y: 9, size: 3},
                {x: 180, y: 24, size: 12},
                {x: 42, y: 48, size: 6},
                {x: 9, y: 15, size: 3},
            ]);
            await createQuads(user0, landQuads);
            const {xs, ys, sizes, selection} = selectQuads(landQuads, [1, 2, 3, 4]);
            const junctions = [];
            await expectRevert(contracts.Estate.connect(contracts.Estate.provider.getSigner(user0)).functions.createFromMultipleQuads(user0, user0, sizes, xs, ys, junctions).then((tx) => tx.wait()), 'JUNCTIONS_MISSING');
        });

        t.test('creating from multiple quads with invalid junctions fails', async (t) => {
            const landQuads = assignIds([
                {x: 5, y: 7, size: 1},
                {x: 6, y: 8, size: 1},
                {x: 6, y: 9, size: 3},
                {x: 6, y: 12, size: 3},
                {x: 3, y: 9, size: 3},
                {x: 180, y: 24, size: 12},
                {x: 42, y: 48, size: 6},
                {x: 9, y: 15, size: 3},
            ]);
            await createQuads(user0, landQuads);
            const {xs, ys, sizes, selection} = selectQuads(landQuads, [1, 2, 3, 4]);
            const junctions = [2];
            await expectRevert(contracts.Estate.connect(contracts.Estate.provider.getSigner(user0)).functions.createFromMultipleQuads(user0, user0, sizes, xs, ys, junctions).then((tx) => tx.wait()), 'JUNCTIONS_INVALID');
        });

        t.test('creating from multiple quads with junctions and destroying get them back', async (t) => {
            const landQuads = assignIds([
                {x: 5, y: 7, size: 1},
                {x: 6, y: 8, size: 1},
                {x: 6, y: 9, size: 3},
                {x: 6, y: 12, size: 3},
                {x: 3, y: 9, size: 3},
                {x: 180, y: 24, size: 12},
                {x: 42, y: 48, size: 6},
                {x: 9, y: 15, size: 3},
            ]);
            await createQuads(user0, landQuads);
            const {xs, ys, sizes, selection} = selectQuads(landQuads, [1, 2, 3, 4]);
            const junctions = [1];
            await contracts.Estate.connect(contracts.Estate.provider.getSigner(user0)).functions.createFromMultipleQuads(user0, user0, sizes, xs, ys, junctions).then((tx) => tx.wait());
            await contracts.Estate.connect(contracts.Estate.provider.getSigner(user0)).functions.destroyAndTransfer(user0, 1, user0).then((tx) => tx.wait());
            for (const landQuad of selection) {
                for (let sx = 0; sx < landQuad.size; sx++) {
                    for (let sy = 0; sy < landQuad.size; sy++) {
                        const id = landQuad.x + sx + ((landQuad.y + sy) * 408);
                        const landOwner = await contracts.Land.callStatic.ownerOf(id);
                        assert.equal(landOwner, user0);
                    }
                }
            }
        });
    });
}

module.exports = {
    runEstateTests
};