const ethers = require('ethers');
const {BigNumber} = ethers;
const tap = require('tap');
const assert = require('assert');
const {deployments, namedAccounts} = require('@nomiclabs/buidler');

const {
    expectRevert,
    tx,
    zeroAddress,
    emptyBytes,
    call,
} = require('../utils');

const EstateTestHelper = require('./testHelper');

const {
    others,
} = namedAccounts;

const user0 = others[0];
const user1 = others[1];
const user2 = others[2];
const user3 = others[3];

function runEstateTests({contractsStore}) {
    tap.test('Estate testing', async (t) => {
        // t.runOnly = true;
        let contracts;
        let helper;
        t.beforeEach(async () => {
            contracts = await contractsStore.resetContracts();
            helper = new EstateTestHelper(contracts);
        });

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
            const landQuads = EstateTestHelper.assignIds([
                {x: 5, y: 7, size: 1},
                {x: 6, y: 8, size: 1},
                {x: 6, y: 9, size: 3},
                {x: 6, y: 12, size: 3},
                {x: 180, y: 24, size: 12},
                {x: 42, y: 48, size: 6},
                {x: 9, y: 15, size: 3},
            ]);
            await helper.mintQuads(user0, landQuads);
            const {xs, ys, sizes, selection} = EstateTestHelper.selectQuads(landQuads, [1, 2, 3]);
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
            const landQuads = EstateTestHelper.assignIds([
                {x: 5, y: 7, size: 1},
                {x: 6, y: 8, size: 1},
                {x: 6, y: 9, size: 3},
                {x: 6, y: 12, size: 3},
                {x: 180, y: 24, size: 12},
                {x: 42, y: 48, size: 6},
                {x: 9, y: 15, size: 3},
            ]);
            await helper.mintQuads(user0, landQuads);
            const {xs, ys, sizes, selection} = EstateTestHelper.selectQuads(landQuads, [1, 2, 3, 4]);
            const junctions = [];
            await expectRevert(contracts.Estate.connect(contracts.Estate.provider.getSigner(user0)).functions.createFromMultipleQuads(user0, user0, sizes, xs, ys, junctions).then((tx) => tx.wait()), 'JUNCTIONS_MISSING');
        });

        t.test('creating from multiple quads with junctions', async (t) => {
            const landQuads = EstateTestHelper.assignIds([
                {x: 5, y: 7, size: 1},
                {x: 6, y: 8, size: 1},
                {x: 6, y: 9, size: 3},
                {x: 6, y: 12, size: 3},
                {x: 3, y: 9, size: 3},
                {x: 180, y: 24, size: 12},
                {x: 42, y: 48, size: 6},
                {x: 9, y: 15, size: 3},
            ]);
            await helper.mintQuads(user0, landQuads);
            const {xs, ys, sizes, selection} = EstateTestHelper.selectQuads(landQuads, [1, 2, 3, 4]);
            const junctions = [1];
            await contracts.Estate.connect(contracts.Estate.provider.getSigner(user0)).functions.createFromMultipleQuads(user0, user0, sizes, xs, ys, junctions).then((tx) => tx.wait());
        });

        t.test('creating from multiple quads without junctions fails', async (t) => {
            const landQuads = EstateTestHelper.assignIds([
                {x: 5, y: 7, size: 1},
                {x: 6, y: 8, size: 1},
                {x: 6, y: 9, size: 3},
                {x: 6, y: 12, size: 3},
                {x: 3, y: 9, size: 3},
                {x: 180, y: 24, size: 12},
                {x: 42, y: 48, size: 6},
                {x: 9, y: 15, size: 3},
            ]);
            await helper.mintQuads(user0, landQuads);
            const {xs, ys, sizes, selection} = EstateTestHelper.selectQuads(landQuads, [1, 2, 3, 4]);
            const junctions = [];
            await expectRevert(contracts.Estate.connect(contracts.Estate.provider.getSigner(user0)).functions.createFromMultipleQuads(user0, user0, sizes, xs, ys, junctions).then((tx) => tx.wait()), 'JUNCTIONS_MISSING');
        });

        t.test('creating from multiple quads with invalid junctions fails', async (t) => {
            const landQuads = EstateTestHelper.assignIds([
                {x: 5, y: 7, size: 1},
                {x: 6, y: 8, size: 1},
                {x: 6, y: 9, size: 3},
                {x: 6, y: 12, size: 3},
                {x: 3, y: 9, size: 3},
                {x: 180, y: 24, size: 12},
                {x: 42, y: 48, size: 6},
                {x: 9, y: 15, size: 3},
            ]);
            await helper.mintQuads(user0, landQuads);
            const {xs, ys, sizes, selection} = EstateTestHelper.selectQuads(landQuads, [1, 2, 3, 4]);
            const junctions = [2];
            await expectRevert(contracts.Estate.connect(contracts.Estate.provider.getSigner(user0)).functions.createFromMultipleQuads(user0, user0, sizes, xs, ys, junctions).then((tx) => tx.wait()), 'JUNCTION_NOT_ADJACENT');
        });

        t.test('creating from multiple quads with junctions and destroying get them back', async (t) => {
            const {selection} = await helper.mintQuadsAndCreateEstate({
                quads: [
                    {x: 5, y: 7, size: 1},
                    {x: 6, y: 8, size: 1},
                    {x: 6, y: 9, size: 3},
                    {x: 6, y: 12, size: 3},
                    {x: 3, y: 9, size: 3},
                    {x: 180, y: 24, size: 12},
                    {x: 42, y: 48, size: 6},
                    {x: 9, y: 15, size: 3},
                ],
                junctions: [1],
                selection: [1, 2, 3, 4]
            }, user0);
            await contracts.Estate.connect(contracts.Estate.provider.getSigner(user0)).functions.burnAndTransferFrom(user0, 1, user0).then((tx) => tx.wait());
            helper.checkLandOwnership(selection, user0);
        });

        t.test('creating from multiple quads and adding more and destroying get them back', async (t) => {
            const {selection} = await helper.mintQuadsAndCreateEstate({
                quads: [
                    {x: 5, y: 7, size: 1},
                    {x: 6, y: 8, size: 1},
                    {x: 6, y: 9, size: 3},
                    {x: 6, y: 12, size: 3},
                    {x: 3, y: 9, size: 3},
                    {x: 180, y: 24, size: 12},
                    {x: 42, y: 48, size: 6},
                    {x: 9, y: 15, size: 3},
                ],
                junctions: [1],
                selection: [1, 2, 3, 4]
            }, user0);

            const extraLandQuads = EstateTestHelper.assignIds([
                {x: 3, y: 12, size: 3},
                {x: 4, y: 15, size: 1},
                {x: 4, y: 16, size: 1},
                {x: 4, y: 17, size: 1},
                {x: 3, y: 18, size: 3},
            ]);
            await helper.mintQuads(user0, extraLandQuads);
            const selected = EstateTestHelper.selectQuads(extraLandQuads);
            const {xs, ys, sizes} = selected;
            const newSelection = selected.selection;
            for (const sel of newSelection) {
                selection.push(sel);
            }
            await contracts.Estate.connect(contracts.Estate.provider.getSigner(user0)).functions.addMultipleQuads(user0, 1, sizes, xs, ys, []).then((tx) => tx.wait());
            await contracts.Estate.connect(contracts.Estate.provider.getSigner(user0)).functions.burnAndTransferFrom(user0, 1, user0).then((tx) => tx.wait());
            helper.checkLandOwnership(selection, user0);
        });

        t.test('creating from multiple quads and adding more with gaps fails', async (t) => {
            const {selection} = await helper.mintQuadsAndCreateEstate({
                quads: [
                    {x: 5, y: 7, size: 1},
                    {x: 6, y: 8, size: 1},
                    {x: 6, y: 9, size: 3},
                    {x: 6, y: 12, size: 3},
                    {x: 3, y: 9, size: 3},
                    {x: 180, y: 24, size: 12},
                    {x: 42, y: 48, size: 6},
                    {x: 9, y: 15, size: 3},
                ],
                junctions: [1],
                selection: [1, 2, 3, 4]
            }, user0);

            const extraLandQuads = EstateTestHelper.assignIds([
                {x: 4, y: 15, size: 1},
                {x: 4, y: 16, size: 1},
                {x: 4, y: 17, size: 1},
                {x: 3, y: 18, size: 3},
            ]);
            await helper.mintQuads(user0, extraLandQuads);
            const selected = EstateTestHelper.selectQuads(extraLandQuads);
            const {xs, ys, sizes} = selected;
            const newSelection = selected.selection;
            for (const sel of newSelection) {
                selection.push(sel);
            }
            await expectRevert(contracts.Estate.connect(contracts.Estate.provider.getSigner(user0)).functions.addMultipleQuads(user0, 1, sizes, xs, ys, []).then((tx) => tx.wait()));
        });

        t.test('creating from multiple quads and adding more with junctions and destroying get them back', async (t) => {
            const {selection} = await helper.mintQuadsAndCreateEstate({
                quads: [
                    {x: 5, y: 7, size: 1},
                    {x: 6, y: 8, size: 1},
                    {x: 6, y: 9, size: 3},
                    {x: 6, y: 12, size: 3},
                    {x: 3, y: 9, size: 3},
                    {x: 180, y: 24, size: 12},
                    {x: 42, y: 48, size: 6},
                    {x: 9, y: 15, size: 3},
                ],
                junctions: [1],
                selection: [1, 2, 3, 4]
            }, user0);
            const extraLandQuads = EstateTestHelper.assignIds([
                {x: 6, y: 15, size: 3},
                {x: 7, y: 18, size: 1},
                {x: 7, y: 19, size: 1},
                {x: 7, y: 20, size: 1},
                {x: 6, y: 21, size: 3},
                {x: 3, y: 15, size: 3},
            ]);
            await helper.mintQuads(user0, extraLandQuads);
            const newSelected = EstateTestHelper.selectQuads(extraLandQuads);
            const {xs, ys, sizes} = newSelected;
            const newSelection = newSelected.selection;
            for (const sel of newSelection) {
                selection.push(sel);
            }
            // console.log({xs, ys, sizes, selection});
            await contracts.Estate.connect(contracts.Estate.provider.getSigner(user0)).functions.addMultipleQuads(user0, 1, sizes, xs, ys, [2, 4]).then((tx) => tx.wait());
            await contracts.Estate.connect(contracts.Estate.provider.getSigner(user0)).functions.burnAndTransferFrom(user0, 1, user0).then((tx) => tx.wait());
            helper.checkLandOwnership(selection, user0);
        });

        t.test('creating Estate with many Lands and destroying get them back', async (t) => {
            const {selection} = await helper.mintQuadsAndCreateEstate({
                quads: [
                    {x: 5, y: 7, size: 1},
                    {x: 6, y: 7, size: 1},
                    {x: 6, y: 8, size: 1},
                    {x: 6, y: 9, size: 3},
                    {x: 6, y: 12, size: 3},
                    
                    {x: 3, y: 9, size: 3},
                    {x: 2, y: 9, size: 1},
                    
                    {x: 4, y: 12, size: 1},
                    {x: 4, y: 13, size: 1},
                    {x: 4, y: 14, size: 1},
                    {x: 4, y: 15, size: 1},
                    {x: 4, y: 16, size: 1},
                    {x: 4, y: 17, size: 1},
                    {x: 4, y: 18, size: 1},
                    {x: 4, y: 19, size: 1},
                    {x: 4, y: 20, size: 1},
                    {x: 4, y: 21, size: 1},
                    {x: 4, y: 22, size: 1},
                    {x: 4, y: 23, size: 1},
                    {x: 4, y: 24, size: 1},
                    {x: 4, y: 25, size: 1},
                    {x: 4, y: 26, size: 1},
                    {x: 4, y: 27, size: 1},
                    {x: 4, y: 28, size: 1},
                    {x: 4, y: 29, size: 1},
                    {x: 4, y: 30, size: 1},
                    {x: 4, y: 31, size: 1},
                    {x: 4, y: 32, size: 1},
                    {x: 4, y: 33, size: 1},
                    {x: 4, y: 34, size: 1},
                    {x: 4, y: 35, size: 1},
                    {x: 4, y: 36, size: 1},
                    {x: 4, y: 37, size: 1},
                ],
                junctions: [3, 5],
            }, user0);
            const receipt = await contracts.Estate.connect(contracts.Estate.provider.getSigner(user0)).functions.burnAndTransferFrom(user0, 1, user0).then((tx) => tx.wait());
            // console.log({gasUsed: receipt.gasUsed.toNumber()});
            helper.checkLandOwnership(selection, user0);
        });

        t.test('creating Estate with many Lands and destroying in 2 step get them back', async (t) => {
            const {selection} = await helper.mintQuadsAndCreateEstate({
                quads: [
                    {x: 5, y: 7, size: 1},
                    {x: 6, y: 7, size: 1},
                    {x: 6, y: 8, size: 1},
                    {x: 6, y: 9, size: 3},
                    {x: 6, y: 12, size: 3},
                    
                    {x: 3, y: 9, size: 3},
                    {x: 2, y: 9, size: 1},
                    
                    {x: 4, y: 12, size: 1},
                    {x: 4, y: 13, size: 1},
                    {x: 4, y: 14, size: 1},
                    {x: 4, y: 15, size: 1},
                    {x: 4, y: 16, size: 1},
                    {x: 4, y: 17, size: 1},
                    {x: 4, y: 18, size: 1},
                    {x: 4, y: 19, size: 1},
                    {x: 4, y: 20, size: 1},
                    {x: 4, y: 21, size: 1},
                    {x: 4, y: 22, size: 1},
                    {x: 4, y: 23, size: 1},
                    {x: 4, y: 24, size: 1},
                    {x: 4, y: 25, size: 1},
                    {x: 4, y: 26, size: 1},
                    {x: 4, y: 27, size: 1},
                    {x: 4, y: 28, size: 1},
                    {x: 4, y: 29, size: 1},
                    {x: 4, y: 30, size: 1},
                    {x: 4, y: 31, size: 1},
                    {x: 4, y: 32, size: 1},
                    {x: 4, y: 33, size: 1},
                    {x: 4, y: 34, size: 1},
                    {x: 4, y: 35, size: 1},
                    {x: 4, y: 36, size: 1},
                    {x: 4, y: 37, size: 1},
                ],
                junctions: [3, 5],
            }, user0);
            await contracts.Estate.connect(contracts.Estate.provider.getSigner(user0)).functions.burn(1).then((tx) => tx.wait());
            const receipt = await contracts.Estate.connect(contracts.Estate.provider.getSigner(user0)).functions.transferFromDestroyedEstate(user0, 1, 0, user0).then((tx) => tx.wait());
            // console.log({gasUsed: receipt.gasUsed.toNumber()});
            helper.checkLandOwnership(selection, user0);
        });

        t.test('creating estate with gap fails', async (t) => {
            await expectRevert(helper.mintQuadsAndCreateEstate({
                quads: [
                    {x: 5, y: 7, size: 1},
                    {x: 6, y: 7, size: 1},
                    {x: 6, y: 8, size: 1},
                    {x: 6, y: 9, size: 3},
                    {x: 6, y: 12, size: 3},
                    
                    {x: 3, y: 9, size: 3},
                    {x: 2, y: 9, size: 1},
                    
                    {x: 4, y: 12, size: 1},
                    {x: 4, y: 13, size: 1},
                    {x: 4, y: 14, size: 1},
                    {x: 4, y: 15, size: 1},
                    {x: 4, y: 16, size: 1},
                    {x: 4, y: 17, size: 1},
                    {x: 4, y: 18, size: 1},
                    {x: 4, y: 19, size: 1},
                    {x: 4, y: 20, size: 1},
                    {x: 4, y: 21, size: 1},
                    {x: 4, y: 22, size: 1},
                    {x: 4, y: 23, size: 1},
                    {x: 4, y: 24, size: 1},
                    {x: 4, y: 25, size: 1},

                    {x: 4, y: 27, size: 1},
                    {x: 4, y: 28, size: 1},
                    {x: 4, y: 29, size: 1},
                    {x: 4, y: 30, size: 1},
                    {x: 4, y: 31, size: 1},
                    {x: 4, y: 32, size: 1},
                    {x: 4, y: 33, size: 1},
                    {x: 4, y: 34, size: 1},
                    {x: 4, y: 35, size: 1},
                    {x: 4, y: 36, size: 1},
                    {x: 4, y: 37, size: 1},
                ],
                junctions: [3, 5],
            }, user0), 'JUNCTIONS_MISSING');
        });

        
    });
}

module.exports = {
    runEstateTests
};