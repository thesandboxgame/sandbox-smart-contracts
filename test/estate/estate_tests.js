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
    });
}

module.exports = {
    runEstateTests
};