const {
  ethers,
  getUnnamedAccounts,
  getNamedAccounts,
  deployments,
} = require('hardhat');
const {AbiCoder} = require('@ethersproject/abi');
const {waitFor, recurseTests, withSnapshot} = require('../utils');
const generateERC1155Tests = require('../erc1155');

// Generic ERC1155 tests for the AssetERC1155 contract - L1
function testAsset() {
  const erc1155Tests = generateERC1155Tests(
    withSnapshot(['Asset'], async () => {
      const {deployer, assetBouncerAdmin} = await getNamedAccounts();
      const otherAccounts = await getUnnamedAccounts();
      const minter = otherAccounts[0];
      const users = otherAccounts.slice(1);

      const assetContractAsBouncerAdmin = await ethers.getContract(
        'Asset',
        assetBouncerAdmin
      );

      await waitFor(assetContractAsBouncerAdmin.setBouncer(minter, true));

      const assetERC1155 = await ethers.getContract('Asset', minter);

      const testMetadataHash = ethers.utils.formatBytes32String('metadataHash');

      // Note: only the designated predicate can mint on L1
      // The ids will be determined by the PolygonAssetERC1155 contract and passed via the predicate (tunnel)
      const admin = await assetERC1155.getAdmin();
      await assetERC1155
        .connect(ethers.provider.getSigner(admin))
        .setPredicate(minter);

      const MOCK_DATA = new AbiCoder().encode(['bytes32'], [testMetadataHash]);

      // Set up single minting for test purposes
      async function mint(id, to, value) {
        // address account,
        // uint256 id,
        // uint256 amount,
        // bytes calldata data

        const receipt = await waitFor(
          assetERC1155
            .connect(ethers.provider.getSigner(minter))
            ['mint(address,uint256,uint256,bytes)'](to, id, value, MOCK_DATA)
        );

        return {
          receipt,
          tokenId: receipt.events.find((v) => v.event === 'TransferSingle')
            .args[3],
        };
      }

      // Set up batch minting for test purposes
      async function mintMultiple(ids, to, supplies) {
        // address to,
        // uint256[] calldata ids,
        // uint256[] calldata amounts,
        // bytes calldata data

        const testMetadataHashes = [];
        for (let i = 0; i < supplies.length; i++) {
          testMetadataHashes.push(testMetadataHash);
        }

        const MOCK_DATA_BATCH = new AbiCoder().encode(
          ['bytes32[]'],
          [testMetadataHashes]
        );

        const tx = await assetERC1155.mintMultiple(
          to,
          ids,
          supplies,
          MOCK_DATA_BATCH
        );

        const receipt = await tx.wait();

        return {
          receipt,
          tokenIds: receipt.events.find((v) => v.event === 'TransferBatch')
            .args[3],
        };
      }

      const assetIds = [
        '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd000000008000000000800800',
        '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd800000008000000001000000',
        '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd000000008000000001800800',
        '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd800000008000000002000000',
        '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd000000008000000002800800',
        '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd800000008000000003000000',
        '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd000000008000000003800800',
        '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd800000008000000004000000',
      ];

      await mint(assetIds[0], minter, 10);
      await mint(assetIds[1], minter, 1);
      await mint(assetIds[2], minter, 5);
      await mint(assetIds[3], minter, 1);
      await mint(assetIds[4], minter, 12);
      await mint(assetIds[5], minter, 1);
      await mint(assetIds[6], minter, 1111);
      await mint(assetIds[7], minter, 1);

      // TODO: fix mintBatch, reverted with reason string 'ID_TAKEN'. Check format of ids
      const ids = [
        '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd000000008000000000005000',
        '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd000000008000000001005001',
        '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd000000008000000002005002',
        '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd000000008000000003005003',
        '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd000000008000000004005004',
        '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd000000008000000005005005',
        '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd000000008000000006005006',
        '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd000000008000000007005007',
        '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd000000008000000008005008',
        '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd000000008000000009005009',
        '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd80000000800000000a00500a',
        '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd00000000800000000b00500b',
        '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd80000000800000000c00500c',
      ];
      const batchIds = (
        await mintMultiple(ids, minter, [
          10,
          5,
          8,
          9,
          10,
          6,
          8,
          8,
          10,
          12,
          1,
          1,
          1,
        ])
      ).tokenIds;

      return {
        ethersProvider: ethers.provider,
        contractAddress: assetERC1155.address,
        contract: assetERC1155,
        users,
        mint,
        mintMultiple,
        deployer,
        tokenIds: assetIds,
        batchIds,
        minter,
        deployments,
        receiverAddress: assetERC1155.address,
        assetContractAsBouncerAdmin,
      };
    }),
    {}
  );

  describe('AssetERC1155:ERC1155', function () {
    for (const test of erc1155Tests) {
      // eslint-disable-next-line mocha/no-setup-in-describe
      recurseTests(test);
    }
  });
}

testAsset();
