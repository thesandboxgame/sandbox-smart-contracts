const {
  ethers,
  getUnnamedAccounts,
  getNamedAccounts,
  deployments,
} = require('hardhat');
const {waitFor, recurseTests, withSnapshot, expectEventWithArgs} = require('../utils');
const generateERC1155Tests = require('../erc1155');

function testAsset() {
  const erc1155Tests = generateERC1155Tests(
    withSnapshot(['AssetERC1155', 'PolygonAssetERC1155'], async () => {
      const {deployer, assetBouncerAdmin} = await getNamedAccounts();
      const otherAccounts = await getUnnamedAccounts();
      const minter = otherAccounts[0];
      const users = otherAccounts.slice(1);

      const assetContractAsBouncerAdmin = await ethers.getContract(
        'Asset',
        assetBouncerAdmin
      );

      const polygonAssetERC1155 = await ethers.getContract(
        'PolygonAssetERC1155',
        assetBouncerAdmin
      );

      await waitFor(polygonAssetERC1155.setBouncer(minter, true));

      const Asset = await ethers.getContract('Asset', minter);

      const receiverAddress = Asset.address;

      const testMetadataHash = ethers.utils.formatBytes32String('metadataHash');

      const ipfsHashString =
        '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e';
      const MOCK_DATA =
        '0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000084e42535759334450000000000000000000000000000000000000000000000000';
    
      async function mint(id, to, value) {
        // Asset to be minted
        const creator = to;
        const supply = value;
        const rarity = 0;
        const owner = to;
        const data = '0x';
    
        let receipt = await waitFor(
          polygonAssetERC1155
            .connect(ethers.provider.getSigner(minter))
            .mint(creator, id, ipfsHashString, supply, rarity, owner, data)
        );
    
        const transferEvent = await expectEventWithArgs(
          polygonAssetERC1155,
          receipt,
          'TransferSingle'
        );
        const tokenId = transferEvent.args[3];

        // Minting directly for Tests only 
    
        const admin = await Asset.getAdmin();
        await Asset.connect(ethers.provider.getSigner(admin)).setPredicate(minter);

        receipt = await waitFor(
          Asset
          .connect(ethers.provider.getSigner(minter))
          .mint(
            to,
            tokenId,
            value,
            MOCK_DATA
          )
        );

        return {
          receipt,
          tokenId: receipt.events.find((v) => v.event === 'TransferSingle')
            .args[3],
        };
      }

      async function mintBatch(to, supplies) {
        const creator = to;
        const rarity = 0;
        const owner = to;
        const data = '0x';
        const tokenIds = [];
        let id = 10;
        for (let i = 0; i < supplies.length; i++) {
          const supply = supplies[i];
          id++;

          let receipt = await waitFor(
            polygonAssetERC1155
              .connect(ethers.provider.getSigner(minter))
              .mint(creator, id, ipfsHashString, supply, rarity, owner, data)
          );
      
          const transferEvent = await expectEventWithArgs(
            polygonAssetERC1155,
            receipt,
            'TransferSingle'
          );
          tokenIds.push(transferEvent.args[3]);
        }

        const admin = await Asset.getAdmin();
        await Asset.connect(ethers.provider.getSigner(admin)).setPredicate(minter);
        const MOCK_DATA_BATCH = "0x68656c6c6f00000000000000000000000000000000000000000000000000000068656c6c6f00000000000000000000000000000000000000000000000000000068656c6c6f00000000000000000000000000000000000000000000000000000068656c6c6f00000000000000000000000000000000000000000000000000000068656c6c6f00000000000000000000000000000000000000000000000000000068656c6c6f00000000000000000000000000000000000000000000000000000068656c6c6f00000000000000000000000000000000000000000000000000000068656c6c6f00000000000000000000000000000000000000000000000000000068656c6c6f00000000000000000000000000000000000000000000000000000068656c6c6f00000000000000000000000000000000000000000000000000000068656c6c6f00000000000000000000000000000000000000000000000000000068656c6c6f00000000000000000000000000000000000000000000000000000068656c6c6f000000000000000000000000000000000000000000000000000000"

        const tx = await Asset.mintBatch(
          to,
          tokenIds,
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
  
      const assetIds = [];
      assetIds.push((await mint(1, minter, 10)).tokenId);
      assetIds.push((await mint(2, minter, 1)).tokenId);
      assetIds.push((await mint(3, minter, 5)).tokenId);
      assetIds.push((await mint(4, minter, 1)).tokenId);
      assetIds.push((await mint(5, minter, 12)).tokenId);
      assetIds.push((await mint(6, minter, 1)).tokenId);
      assetIds.push((await mint(7, minter, 1111)).tokenId);
      assetIds.push((await mint(8, minter, 1)).tokenId);

      // TODO: fix mintBatch for failing tests
      // const batchIds = (
      //   await mintBatch(minter, [
      //     10,
      //     5,
      //     8,
      //     9,
      //     10,
      //     6,
      //     8,
      //     8,
      //     10,
      //     12,
      //     1,
      //     1,
      //     1,
      //   ])
      // ).tokenIds;

      return {
        ethersProvider: ethers.provider,
        contractAddress: Asset.address,
        contract: Asset,
        users,
        mint,
        // mintBatch,
        deployer,
        tokenIds: assetIds,
        batchIds: assetIds,
        minter,
        deployments,
        receiverAddress,
        assetContractAsBouncerAdmin,
      };
    }),
    {}
  );

  describe('Asset:ERC1155', function () {
    for (const test of erc1155Tests) {
      // eslint-disable-next-line mocha/no-setup-in-describe
      recurseTests(test);
    }
  });
}

testAsset();
