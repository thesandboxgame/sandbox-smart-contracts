const {
  ethers,
  getUnnamedAccounts,
  getNamedAccounts,
  deployments,
} = require('hardhat');
const {AbiCoder} = require('@ethersproject/abi');
const {
  waitFor,
  recurseTests,
  withSnapshot,
  expectEventWithArgs,
} = require('../utils');
const generateERC1155Tests = require('../erc1155');

// Generic ERC1155 tests for the PolygonAssetERC1155 contract - L2
function testAsset() {
  const erc1155Tests = generateERC1155Tests(
    withSnapshot(['PolygonAssetERC1155'], async () => {
      const {deployer, assetBouncerAdmin} = await getNamedAccounts();
      const otherAccounts = await getUnnamedAccounts();
      const minter = otherAccounts[0];
      const users = otherAccounts.slice(1);

      const polygonAssetContractAsBouncerAdmin = await ethers.getContract(
        'PolygonAssetERC1155',
        assetBouncerAdmin
      );

      const polygonAssetERC1155 = await ethers.getContract(
        'PolygonAssetERC1155',
        minter
      );

      await waitFor(
        polygonAssetERC1155
          .connect(ethers.provider.getSigner(assetBouncerAdmin))
          .setBouncer(minter, true)
      );

      const testMetadataHash = ethers.utils.formatBytes32String('metadataHash');

      const ipfsHashString =
        '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e';

      const MOCK_DATA = new AbiCoder().encode(['bytes32'], [testMetadataHash]);

      async function mint(id, to, value) {
        // address creator,
        // uint40 packId,
        // bytes32 hash,
        // uint256 supply,
        // address owner,
        // bytes calldata data

        const creator = to;
        const supply = value;
        const owner = to;

        let receipt = await waitFor(
          polygonAssetERC1155
            .connect(ethers.provider.getSigner(minter))
            ['mint(address,uint40,bytes32,uint256,address,bytes)'](
              creator,
              id,
              ipfsHashString,
              supply,
              owner,
              MOCK_DATA
            )
        );

        const transferEvent = await expectEventWithArgs(
          polygonAssetERC1155,
          receipt,
          'TransferSingle'
        );
        const tokenId = transferEvent.args[3];

        return {
          receipt,
          tokenId,
        };
      }

      async function mintMultiple(to, supplies) {
        // address creator,
        // uint40 packId,
        // bytes32 hash,
        // uint256[] calldata supplies,
        // bytes calldata rarityPack,
        // address owner,
        // bytes calldata data

        const creator = to;
        const rarityPack = 0;
        const owner = to;
        const packId = 10;

        const testMetadataHashes = [];
        for (let i = 0; i < supplies.length; i++) {
          testMetadataHashes.push(testMetadataHash);
        }

        const MOCK_DATA_BATCH = new AbiCoder().encode(
          ['bytes32[]'],
          [testMetadataHashes]
        );

        const tx = await polygonAssetERC1155.mintMultiple(
          creator,
          packId,
          ipfsHashString,
          supplies,
          rarityPack,
          owner,
          MOCK_DATA_BATCH
        );

        const receipt = await tx.wait();

        return {
          receipt,
          tokenIds: receipt.events.find((v) => v.event === 'TransferBatch')
            .args[3],
        };
      }

      const assetIds = [];
      assetIds.push((await mint(1, minter, 10)).tokenId);
      assetIds.push((await mint(2, minter, 1)).tokenId);
      assetIds.push((await mint(3, minter, 5)).tokenId);
      assetIds.push((await mint(4, minter, 1)).tokenId);
      assetIds.push((await mint(5, minter, 12)).tokenId);
      assetIds.push((await mint(6, minter, 1)).tokenId);
      assetIds.push((await mint(7, minter, 1111)).tokenId);
      assetIds.push((await mint(8, minter, 1)).tokenId);

      const batchIds = (
        await mintMultiple(minter, [10, 5, 8, 9, 10, 6, 8, 8, 10, 12, 2, 2, 2])
      ).tokenIds;

      return {
        ethersProvider: ethers.provider,
        contractAddress: polygonAssetERC1155.address,
        contract: polygonAssetERC1155,
        users,
        mint,
        mintMultiple,
        deployer,
        tokenIds: assetIds,
        batchIds,
        minter,
        deployments,
        receiverAddress: polygonAssetERC1155.address,
        assetContractAsBouncerAdmin: polygonAssetContractAsBouncerAdmin,
      };
    }),
    {}
  );

  describe('PolygonAssetERC1155:ERC1155', function () {
    for (const test of erc1155Tests) {
      // eslint-disable-next-line mocha/no-setup-in-describe
      recurseTests(test);
    }
  });
}

testAsset();
