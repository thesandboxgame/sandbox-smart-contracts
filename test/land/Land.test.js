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

t.test('Running LAND tests', async (t) => {
    let land;

    t.beforeEach(async () => {
        land = await deployLand();
    });

    t.test('Should mint a block for account 1', async () => {
        await land.methods.mintBlock(accounts[1], 3, 0, 0).send({
            from: accounts[1],
            gas,
        });

        const balance = await balanceOf(land, accounts[1]);
        assert.equal(balance, 9, 'Account 1 balance is wrong');
    });

    t.test('Should not transfer a token from an empty balance', async () => {
        expectThrow(
            await transferFrom(land, accounts[1], accounts[2], 0, {
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

        expectThrow(
            await land.methods.mintBlock(accounts[0], 1, 1, 1).send({
                from: accounts[0],
                gas,
            })
        );
    });
});

// runERC721tests('Land', deployLand, mint);
