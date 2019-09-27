const t = require('tap');
const rocketh = require('rocketh');
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

  t.test('Should try to mint a land', async () => {
    await land.methods.mintBlock(accounts[0], 1, 0, 0);
  });

  t.test('Should get the balance of account 0', async () => {
    const balance = await land.methods.balanceOf(accounts[0]).call();

    console.log(balance);
  });
});

// runERC721tests('Land', deployLand, mint);
