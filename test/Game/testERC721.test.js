// const {ethers, getNamedAccounts, ethereum} = require('@nomiclabs/buidler');
const {ethers, getNamedAccounts, getUnnamedAccounts} = require('hardhat');
const {BigNumber, utils} = require('ethers');
const Prando = require('prando');
const {
  expectEventWithArgs,
  expectEventWithArgsFromReceipt,
  withSnapshot,
} = require('../utils');
const {toUtf8Bytes} = require('ethers/lib/utils');

const rng = new Prando('GameToken ERC721 tests');

async function getRandom() {
  return rng.nextInt(1, 1000000000);
}

let packId = 100;
let i = 0;

const dummyHash =
  '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e'; // Should not be empty

const creation1155 = {
  assetIdsToRemove: [],
  assetAmountsToRemove: [],
  assetIdsToAdd: [],
  assetAmountsToAdd: [5, 5, 5, 5, 5, 5],
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

const erc721Tests = require('../erc721')(
  withSnapshot(['Asset', 'AssetERC721', 'ChildGameToken'], async () => {
    const {
      gameTokenAdmin,
      assetBouncerAdmin,
      assetAdmin,
    } = await getNamedAccounts();
    const others = await getUnnamedAccounts();

    const contract = await ethers.getContract('ChildGameToken');

    const gameAsAdmin = await contract.connect(
      ethers.provider.getSigner(gameTokenAdmin)
    );
    await gameAsAdmin.changeMinter(gameTokenAdmin);

    const assetContract1155 = await ethers.getContract('Asset');
    const assetContract721 = await ethers.getContract('AssetERC721');

    await [...others].map(async (user) => {
      const assetContract1155AsUser = await assetContract1155.connect(
        ethers.provider.getSigner(user)
      );
      await assetContract1155AsUser.setApprovalForAll(contract.address, true);
      const assetContract721AsUser = await assetContract721.connect(
        ethers.provider.getSigner(user)
      );
      await assetContract721AsUser.setApprovalForAll(contract.address, true);
    });

    const assetAsAdmin = await assetContract1155.connect(
      ethers.provider.getSigner(assetAdmin)
    );

    const assetAsBouncerAdmin = await assetContract1155.connect(
      ethers.provider.getSigner(assetBouncerAdmin)
    );

    await assetAsBouncerAdmin.setBouncer(assetAdmin, true);

    async function mint(to) {
      const assets = [];
      async function supplyAssets(to) {
        for (i; i < 6; i++) {
          const tx = await assetAsAdmin[
            'mint(address,uint40,bytes32,uint256,address,bytes)'
          ](to, packId, dummyHash, 100, to, '0x');
          const receipt = tx.wait();
          const event = await expectEventWithArgsFromReceipt(
            assetContract1155,
            receipt,
            'TransferSingle'
          );
          const id = event.args[3];
          assets.push(id);
          packId++;
        }
      }
      await supplyAssets(to);
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

    return {contractAddress: contract.address, users: others, mint};
  }),
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
