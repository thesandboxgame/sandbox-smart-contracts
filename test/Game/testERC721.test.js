// const {ethers, getNamedAccounts, ethereum} = require('@nomiclabs/buidler');
const {ethers, getNamedAccounts, getUnnamedAccounts} = require('hardhat');
const {BigNumber, utils} = require('ethers');
const Prando = require('prando');
const {supplyAssets} = require('./assets');
const {expectEventWithArgs, withSnapshot} = require('../utils');
const {toUtf8Bytes} = require('ethers/lib/utils');

const rng = new Prando('GameToken ERC721 tests');

async function getRandom() {
  return rng.nextInt(1, 1000000000);
}

const creation1155 = {
  assetIdsToRemove: [],
  assetAmountsToRemove: [],
  assetIdsToAdd: [],
  assetAmountsToAdd: [1],
};

const creation721 = {
  assetIdsToRemove: [],
  assetIdsToAdd: [],
};

const creation = {
  gameData1155: creation1155,
  gameData721: creation721,
  uri: utils.keccak256(toUtf8Bytes('My GAME token URI!')),
};

const newCreationAdd1155 = (creation, assetIdsToAdd1155) => {
  return {
    ...creation,
    gameData1155: {
      ...creation.gameData1155,
      assetIdsToAdd: assetIdsToAdd1155,
    },
  };
};

/*
const creation = {
  assetIdsToRemove: [],
  assetAmountsToRemove: [],
  assetIdsToAdd: [],
  assetAmountsToAdd: [1],
  uri: utils.keccak256(toUtf8Bytes('My GAME token URI!')),
};
*/

const erc721Tests = require('../erc721')(
  withSnapshot(
    ['GameAsset1155', 'GameAsset721', 'ChildGameToken'],
    async () => {
      const {gameTokenAdmin} = await getNamedAccounts();
      const others = await getUnnamedAccounts();

      const contract = await ethers.getContract('ChildGameToken');

      const gameAsAdmin = await contract.connect(
        ethers.provider.getSigner(gameTokenAdmin)
      );
      await gameAsAdmin.changeMinter(gameTokenAdmin);

      async function mint(to) {
        const assets = await supplyAssets(to, [1]);
        const randomId = await getRandom();

        const receipt = await gameAsAdmin.createGame(
          to,
          to,
          newCreationAdd1155(creation, assets),
          ethers.constants.AddressZero,
          randomId
        );
        const updateEvent = await expectEventWithArgs(
          contract,
          receipt,
          'GameTokenUpdated'
        );
        const tokenId = BigNumber.from(updateEvent.args[1]);
        return {receipt, tokenId};
      }

      async function grant(contract, users) {
        const assetContract1155 = await ethers.getContract('GameAsset1155');
        const assetContract721 = await ethers.getContract('GameAsset721');

        await [...users].map(async (user) => {
          const assetContract1155AsUser = await assetContract1155.connect(
            ethers.provider.getSigner(user)
          );
          await assetContract1155AsUser.setApprovalForAll(
            contract.address,
            true
          );
          const assetContract721AsUser = await assetContract721.connect(
            ethers.provider.getSigner(user)
          );
          await assetContract721AsUser.setApprovalForAll(
            contract.address,
            true
          );
        });
      }

      return {contractAddress: contract.address, users: others, mint, grant};
    }
  ),
  {
    batchTransfer: true,
    burn: true,
    burnAsset: false,
    mandatoryERC721Receiver: true,
  }
);

function recurse(test) {
  if (test.subTests) {
    // eslint-disable-next-line mocha/no-setup-in-describe
    describe(test.title, function () {
      // eslint-disable-next-line mocha/no-setup-in-describe
      for (const subTest of test.subTests) {
        // eslint-disable-next-line mocha/no-setup-in-describe
        recurse(subTest);
      }
    });
  } else {
    it(test.title, test.test);
  }
}

describe('GameToken:ERC721', function () {
  for (const test of erc721Tests) {
    // eslint-disable-next-line mocha/no-setup-in-describe
    recurse(test);
  }
});
