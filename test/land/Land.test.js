const t = require('tap');
const rocketh = require('rocketh');
const {assert} = require('chai');
const {getDeployedContract} = require('../../lib');
const {runERC721tests} = require('../erc721_tests');
const {
    tx,
    gas
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

t.test('Normal behavior', async (t) => {
    let land;

    t.test('Should deploy the Land contract', async () => {
        await rocketh.runStages();
        land = await getDeployedContract('Land');
    });

    t.test('Should try to mint a block for account 1', async () => {
        const size = 3;

        await land.methods.mintBlock(accounts[1], size, 0, 0).send({
            from: accounts[1],
            gas,
        });

        const balance = await land.methods.balanceOf(accounts[1]).call();
        assert.equal(balance, size * size, 'Account 0 balance is wrong');
    });

    t.test('Should try to mint a block for account 0', async () => {
        const size = 1;

        await land.methods.mintBlock(accounts[0], size, 1, 1).send({
            from: accounts[0],
            gas,
        });

        const balance = await land.methods.balanceOf(accounts[0]).call();
        assert.equal(balance, size * size, 'Account 0 balance is wrong');

        const balance2 = await land.methods.balanceOf(accounts[1]).call();
        assert.equal(balance2, 9, 'Account 0 balance is wrong');
    });
});

// runERC721tests('Land', deployLand, mint);
