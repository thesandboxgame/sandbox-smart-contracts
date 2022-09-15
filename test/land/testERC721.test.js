const {ethers, getNamedAccounts, getUnnamedAccounts} = require('hardhat');
const {withSnapshot} = require('../utils');

const erc721Tests = require('../erc721')(
  withSnapshot(['Land'], async () => {
    const {landAdmin} = await getNamedAccounts();
    const others = await getUnnamedAccounts();

    const contract = await ethers.getContract('Land');

    const landAsAdmin = await contract.connect(
      ethers.provider.getSigner(landAdmin)
    );

    await contract
      .connect(ethers.provider.getSigner(landAdmin))
      .setMinter(landAdmin, true);

    let x = 0;

    async function mint(to) {
      const bytes = '0x3333';
      const GRID_SIZE = 408;
      x = ++x;
      const y = 0;
      const size = 1;
      const tokenId = x + y * GRID_SIZE;

      const receipt = await landAsAdmin.mintQuad(to, size, x, y, bytes);

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

describe('LandBaseToken:ERC721', function () {
  for (const test of erc721Tests) {
    // eslint-disable-next-line mocha/no-setup-in-describe
    recurse(test);
  }
});
