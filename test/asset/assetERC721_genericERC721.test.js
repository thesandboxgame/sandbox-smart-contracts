const {ethers, getNamedAccounts, getUnnamedAccounts} = require('hardhat');
const {AbiCoder} = require('ethers/lib/utils');

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
    const assetContractAsAssetAdmin = await asset.connect(
      ethers.provider.getSigner(assetAdmin)
    );

    // Setup roles
    // Add assetAdmin as a MINTER for testing purposes only
    const MINTER_ROLE = await asset.MINTER_ROLE();
    await assetContractAsAssetAdmin.grantRole(MINTER_ROLE, assetAdmin);

    // Mint
    let id = 0;
    async function mint(to) {
      id = ++id;
      const abiCoder = new AbiCoder();
      const uri = 'http://myMetadata.io/1';
      const data = abiCoder.encode(['string'], [uri]);

      const receipt = await waitFor(
        // assetContractAsAssetAdmin.mint(to, id, data)
        assetContractAsAssetAdmin['mint(address,uint256,bytes)'](to, id, data)
      );

      const event = await expectEventWithArgsFromReceipt(
        asset,
        receipt,
        'Transfer'
      );
      const tokenId = event.args[2];
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

describe('Asset:ERC721', function () {
  for (const test of erc721Tests) {
    // eslint-disable-next-line mocha/no-setup-in-describe
    recurse(test);
  }
});
