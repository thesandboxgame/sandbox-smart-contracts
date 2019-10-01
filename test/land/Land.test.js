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

t.test('Running LAND tests', async (t) => {
    let land;

    t.beforeEach(async () => {
        land = await deployLand();
    });

    t.test('Should mint a 3x3 block for account 1', async () => {
        await mintBlock(land, accounts[1], 3, 0, 0, {
            from: accounts[1],
            gas,
        });

        const balance = await balanceOf(land, accounts[1]);
        assert.equal(balance, 9, 'Account 1 balance is wrong');
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
        await land.methods.mintBlock(accounts[1], 3, 0, 0).send({
            from: accounts[1],
            gas,
        });

        await expectThrow(
            land.methods.mintBlock(accounts[0], 1, 1, 1).send({
                from: accounts[0],
                gas,
            })
        );
    });
});

// runERC721tests('Land', deployLand, mint);
