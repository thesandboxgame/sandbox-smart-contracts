const {ethers, getNamedAccounts, getUnnamedAccounts} = require('hardhat');

const {
  waitFor,
  expectEventWithArgsFromReceipt,
  withSnapshot,
} = require('../utils');

const erc721Tests = require('../erc721')(
  withSnapshot(['AssetERC721'], async () => {
    const others = await getUnnamedAccounts();
    const {assetAdmin} = await getNamedAccounts();

    const asset = await ethers.getContract('AssetERC721');
    console.log(asset, 'asset');
    const assetContractAsAssetAdmin = await ethers.getContract(
      'AssetERC721',
      assetAdmin
    );

    let id = 0;

    async function mint(to) {
      const creator = to;
      id = ++id;
      const data = '0x';

      const receipt = await waitFor(
        assetContractAsAssetAdmin.mint(creator, id, data)
      );

      const event = await expectEventWithArgsFromReceipt(
        asset,
        receipt,
        'TransferSingle'
      );
      console.log(event.args, 'args');
      const tokenId = event.args[3];
      return {receipt, tokenId};
    }
    return {contractAddress: asset.address, users: others, mint};
  }),
  {
    batchTransfer: false,
    burn: false,
    burnAsset: true,
    mandatoryERC721Receiver: false,
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

describe.only('Asset:ERC721', function () {
  for (const test of erc721Tests) {
    // eslint-disable-next-line mocha/no-setup-in-describe
    recurse(test);
  }
});
