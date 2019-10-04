const t = require('tap');
const rocketh = require('rocketh');
const {assert} = require('chai');
const {getDeployedContract} = require('../../lib');
const {runERC721tests} = require('../erc721_tests');

const {
    transferFrom,
    balanceOf,
} = require('../erc721');

const {
    tx,
    gas,
    expectThrow,
} = require('../utils');

const {
    accounts,
} = rocketh;

async function deployLand() {
    await rocketh.runStages();
    return getDeployedContract('Land');
}

async function mint(contract, creator) {
    const receipt = await tx(contract, 'mint', {from: creator, gas}, creator);
    return receipt.events.Transfer.returnValues._tokenId;
}

async function mintBlock(contract, to, size, x, y, options) {
    return contract.methods.mintBlock(to, size, x, y).send(options);
}

const possibleSizes = [
    1,
    3,
    6,
    12,
    24,
];

const gridSize = 408;

t.test('Running LAND tests', async (t) => {
    let land;

    t.beforeEach(async () => {
        land = await deployLand();
    });

    for (let i = 0; i < possibleSizes.length; i += 1) {
        const size = possibleSizes[i];

        t.test(`Should mint a ${size}x${size} block for account 1`, async () => {
            await mintBlock(land, accounts[1], size, 0, 0, {
                from: accounts[1],
                gas,
            });

            const balance = await balanceOf(land, accounts[1]);
            assert.equal(balance, size * size, 'Account 1 balance is wrong');
        });
    }

    t.test('Should mint a 24x24 block', async () => {
        await mintBlock(land, accounts[1], 24, 0, 0, {
            from: accounts[1],
            gas,
        });

        const balance = await balanceOf(land, accounts[1]);
        assert.equal(balance, 24 * 24, 'Account 1 balance is wrong');
    });

    t.test('Should not mint a block out of bounds', async () => {
        await expectThrow(
            mintBlock(land, accounts[1], 1, gridSize, gridSize, {
                from: accounts[1],
                gas,
            }),
        );
    });

    t.test('Should not transfer a token if not owner / without approval', async () => {
        await land.methods.mintBlock(accounts[0], 1, 0, 0).send({
            from: accounts[0],
            gas,
        });

        await expectThrow(
            transferFrom(land, accounts[0], accounts[1], 0, {
                from: accounts[1],
                gas,
            }),
        );
    });

    t.test('Should give account 1 approval for account 0 tokens', async () => {
        await land.methods.mintBlock(accounts[0], 1, 0, 0).send({
            from: accounts[0],
            gas,
        });

        await expectThrow(
            transferFrom(land, accounts[0], accounts[1], 0, {
                from: accounts[1],
                gas,
            }),
        );
    });

    t.test('Should not mint a land on top of another one', async () => {
        await land.methods.mintBlock(accounts[1], 1, 0, 0).send({
            from: accounts[1],
            gas,
        });

        await expectThrow(
            land.methods.mintBlock(accounts[0], 3, 0, 0).send({
                from: accounts[0],
                gas,
            })
        );
    });
});

// runERC721tests('Land', deployLand, mint);
