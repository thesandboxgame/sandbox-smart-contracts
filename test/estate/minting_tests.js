const ethers = require('ethers');
const {BigNumber} = ethers;
const tap = require('tap');
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

const gas = 1000000;

function runMintingTestFromSale({
    contractStore,
    minter
}) {
    tap.test('Minting from Sale', async (t) => {
        let contracts;
        t.beforeEach(async () => {
            contracts = await contractStore.resetContracts();
        });

        t.test('purchase an estate', async () => {
            const x = 0;
            const y = 0;
            const size = 1;
            const sandPrice = '100000';
            const id = x + (y * 408);
            await contracts.LandPreSale_3.functions.buyLandWithETH(
                user0,
                contracts.Estate.address,
                zeroAddress,
                x, y, size,
                sandPrice,
                '0xfffff', //salt
                [], // proof
                emptyBytes // referral
            );
            const owner = await contracts.Land.callStatic.ownerOf(id);
            tap.equal(owner, )
        });
    });
}

module.exports = {
    runMintingTestFromSale
};