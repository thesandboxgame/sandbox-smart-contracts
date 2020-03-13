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
            const id = x + (y * 408);
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
            const landOwner = await contracts.Land.callStatic.ownerOf(id);
            assert.equal(landOwner, contracts.Estate.address);
            const estateOwner = await contracts.Estate.callStatic.ownerOf(1);
            t.equal(estateOwner, user1);
        });
    });
}

module.exports = {
    runMintingTestFromSale
};