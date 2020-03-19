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

function runMintingTestFromSale({contractsStore}) {
    tap.test('Minting from Sale', async (t) => {
        let contracts;
        t.beforeEach(async () => {
            contracts = await contractsStore.resetContracts();
        });

        t.test('purchase an estate', async (t) => {
            const land = contracts.lands.find((l) => l.size === 6);
            const proof = contracts.getProof(land);
            const x = land.x;
            const y = land.y;
            const size = land.size;
            const sandPrice = land.price;
            const salt = land.salt;
            const tx = await contracts.LandSale.connect(contracts.LandSale.provider.getSigner(user0)).functions.buyLandWithETH(
                user0,
                user1,
                zeroAddress,
                x, y, size,
                sandPrice,
                salt,
                proof,
                emptyBytes, // referral
                {value: BigNumber.from('30000000000000000000')}
            );
            await tx.wait();

            // const topCornerId = x + (y * 408);
            // const landOwner = await contracts.Land.callStatic.ownerOf(topCornerId);
            // assert.equal(landOwner, contracts.Estate.address);

            for (let sx = 0; sx < size; sx++) {
                for (let sy = 0; sy < size; sy++) {
                    const id = x + sx + ((y + sy) * 408);
                    const landOwner = await contracts.Land.callStatic.ownerOf(id);
                    assert.equal(landOwner, contracts.Estate.address);
                }
            }

            const estateOwner = await contracts.Estate.callStatic.ownerOf(1);
            assert.equal(estateOwner, user1);
        });

        t.test('purchase an estate and destroyAndTransfer', async (t) => {
            const land = contracts.lands.find((l) => l.size === 6);
            const proof = contracts.getProof(land);
            const x = land.x;
            const y = land.y;
            const size = land.size;
            const sandPrice = land.price;
            const salt = land.salt;
            await contracts.LandSale.connect(contracts.LandSale.provider.getSigner(user0)).functions.buyLandWithETH(
                user0,
                user1,
                zeroAddress,
                x, y, size,
                sandPrice,
                salt,
                proof,
                emptyBytes, // referral
                {value: BigNumber.from('30000000000000000000')}
            ).then((tx) => tx.wait());

            const estateId = 1;

            await contracts.Estate.connect(contracts.Estate.provider.getSigner(user1)).functions.destroyAndTransfer(
                user1,
                estateId,
                user2
            ).then((tx) => tx.wait());

            for (let sx = 0; sx < size; sx++) {
                for (let sy = 0; sy < size; sy++) {
                    const id = x + sx + ((y + sy) * 408);
                    const landOwner = await contracts.Land.callStatic.ownerOf(id);
                    assert.equal(landOwner, user2);
                }
            }
        });
    });
}

module.exports = {
    runMintingTestFromSale
};