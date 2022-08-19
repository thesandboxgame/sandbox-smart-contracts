const {ethers, getUnnamedAccounts} = require('hardhat');
const {setupUser} = require('../utils');
const {constants} = require('ethers');

const zeroAddress = constants.AddressZero;

const {
  waitFor,
  expectEventWithArgsFromReceipt,
  withSnapshot,
} = require('../utils');

let mockLandCounter = 1;

const erc721Tests = require('../erc721')(
  withSnapshot(['PolygonLease', 'MockLandWithMint'], async () => {
    const others = await getUnnamedAccounts();

    const PolygonLease = await ethers.getContract('PolygonLease');
    const MockLandWithMint = await ethers.getContract('MockLandWithMint');

    const owner = await setupUser(others[1], {
      MockLandWithMint,
      PolygonLease,
    });

    // mint a lease
    async function mint(to) {
      const landReceipt = await waitFor(
        owner.MockLandWithMint.mintQuad(
          owner.address,
          1,
          mockLandCounter,
          mockLandCounter,
          '0x3333'
        )
      );
      mockLandCounter++;

      const transferEvent = await expectEventWithArgsFromReceipt(
        MockLandWithMint,
        landReceipt,
        'Transfer'
      );
      const landTokenId = transferEvent.args[2];

      const receipt = await waitFor(
        owner.PolygonLease.create(
          MockLandWithMint.address,
          landTokenId,
          to,
          zeroAddress
        )
      );

      const event = await expectEventWithArgsFromReceipt(
        PolygonLease,
        receipt,
        'Transfer'
      );
      const tokenId = event.args[2];
      return {receipt, tokenId};
    }
    return {contractAddress: PolygonLease.address, users: others, mint};
  }),
  {
    batchTransfer: false,
    burn: false,
    burnAsset: false,
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

describe('Lease:ERC721', function () {
  for (const test of erc721Tests) {
    // eslint-disable-next-line mocha/no-setup-in-describe
    recurse(test);
  }
});
