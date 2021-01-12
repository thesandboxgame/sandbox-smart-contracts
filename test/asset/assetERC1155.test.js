const {
  ethers,
  getUnnamedAccounts,
  getNamedAccounts,
  deployments,
} = require('hardhat');
const {waitFor, recurseTests} = require('../utils');
const generateERC1155Tests = require('../erc1155');

function testAsset() {
  const erc1155Tests = generateERC1155Tests(
    async () => {
      const {deployer, assetBouncerAdmin} = await getNamedAccounts();
      const otherAccounts = await getUnnamedAccounts();
      const minter = otherAccounts[0];
      await deployments.fixture();

      const assetContractAsBouncerAdmin = await ethers.getContract(
        'Asset',
        assetBouncerAdmin
      );
      await waitFor(assetContractAsBouncerAdmin.setBouncer(minter, true));

      const Asset = await ethers.getContract('Asset', minter);

      const testMetadataHash = ethers.utils.formatBytes32String('metadataHash');

      // eslint-disable-next-line max-params
      async function mint(testPackId, user) {
        const tx = await Asset.mint(
          user,
          testPackId,
          testMetadataHash,
          1,
          1,
          user,
          '0x'
        );
        const receipt = await tx.wait();
        return {
          receipt,
          tokenId: receipt.events
            .find((v) => v.event === 'TransferSingle')
            .args[3].toString(),
        };
      }

      return {
        ethersProvider: ethers.provider,
        contractAddress: Asset.address,
        users: otherAccounts,
        mint,
        deployer,
      };
    },
    {
      batchTransfer: true,
      mandatoryERC1155Receiver: true,
    }
  );

  describe('Asset:ERC1155', function () {
    for (const test of erc1155Tests) {
      // eslint-disable-next-line mocha/no-setup-in-describe
      recurseTests(test);
    }
  });
}

testAsset();
