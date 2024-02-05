/* eslint-disable mocha/no-skipped-tests */
import {getAssetChainIndex, waitFor, withSnapshot} from '../utils';
import {expect} from '../chai-setup';
import {originalAssetFixtures} from '../common/fixtures/asset';

const setupOriginalAsset = withSnapshot(
  ['AssetV1', 'Sand'],
  originalAssetFixtures
);

describe('Test first Asset contract and upgrade process for splitting into ERC1155 and ERC721', function () {
  describe('transfer', function () {
    it('user sending asset to itself keep the same balance', async function () {
      const {Asset, users, mintAsset} = await setupOriginalAsset();
      const tokenId = await mintAsset(users[0].address, 20);
      await waitFor(
        users[0].Asset[
          'safeTransferFrom(address,address,uint256,uint256,bytes)'
        ](users[0].address, users[0].address, tokenId, 10, '0x')
      );
      const balance = await Asset['balanceOf(address,uint256)'](
        users[0].address,
        tokenId
      );
      expect(balance).to.be.equal(20);
    });

    it('can transfer assets', async function () {
      const {Asset, users, mintAsset} = await setupOriginalAsset();
      const tokenId = await mintAsset(users[1].address, 11);
      await waitFor(
        users[1].Asset[
          'safeTransferFrom(address,address,uint256,uint256,bytes)'
        ](users[1].address, users[2].address, tokenId, 10, '0x')
      );
      const balance = await Asset['balanceOf(address,uint256)'](
        users[2].address,
        tokenId
      );
      expect(balance).to.be.equal(10);
    });

    it('user batch sending asset to itself keep the same balance', async function () {
      const {Asset, users, mintAsset} = await setupOriginalAsset();
      const tokenId = await mintAsset(users[0].address, 20);
      await waitFor(
        users[0].Asset.safeBatchTransferFrom(
          users[0].address,
          users[0].address,
          [tokenId],
          [10],
          '0x'
        )
      );
      const balance = await Asset['balanceOf(address,uint256)'](
        users[0].address,
        tokenId
      );
      expect(balance).to.be.equal(20);
    });

    it('user batch sending in series whose total is more than its balance', async function () {
      const {Asset, users, mintAsset} = await setupOriginalAsset();
      const tokenId = await mintAsset(users[0].address, 20);
      await waitFor(
        users[0].Asset.safeBatchTransferFrom(
          users[0].address,
          users[0].address,
          [tokenId, tokenId, tokenId],
          [10, 20, 20],
          '0x'
        )
      );
      const balance = await Asset['balanceOf(address,uint256)'](
        users[0].address,
        tokenId
      );
      expect(balance).to.be.equal(20);
    });

    it('user batch sending more asset that it owns should fails', async function () {
      const {users, mintAsset} = await setupOriginalAsset();
      const tokenId = await mintAsset(users[0].address, 20);
      await expect(
        users[0].Asset.safeBatchTransferFrom(
          users[0].address,
          users[0].address,
          [tokenId],
          [30],
          '0x'
        )
      ).to.be.revertedWith(`can't substract more than there is`);
    });
  });

  describe('bitwise operations, collections and extraction', function () {
    it('cannot get the chainIndex from the tokenId when supply > 1', async function () {
      // CHAIN_INDEX_OFFSET_MULITPLIER did not exist in original version so this returns the NFT_INDEX
      const {users, mintAsset} = await setupOriginalAsset();
      const tokenId = await mintAsset(users[1].address, 11);
      const chainIndex = getAssetChainIndex(tokenId);
      expect(chainIndex).to.be.equal(0);
    });

    it('cannot get the chainIndex from the tokenId when supply == 1', async function () {
      // CHAIN_INDEX_OFFSET_MULITPLIER did not exist in original version so this returns the NFT_INDEX
      const {users, mintAsset} = await setupOriginalAsset();
      const tokenId = await mintAsset(users[1].address, 1);
      const chainIndex = getAssetChainIndex(tokenId);
      expect(chainIndex).to.be.equal(0);
    });

    it('collectionIndexOf reverts if provided ID is not an ERC721 and supply > 1', async function () {
      const {users, mintAsset, originalAsset} = await setupOriginalAsset();
      const tokenId = await mintAsset(users[1].address, 11);
      await expect(originalAsset.collectionIndexOf(tokenId)).to.be.revertedWith(
        'NFT does not exist'
      );
      // ERC1155 with supply > 1 is considered to be a "FT" by the original Asset contract
    });

    it('collectionIndexOf reverts if provided ID is not an ERC721 and supply == 1', async function () {
      const {users, mintAsset, originalAsset} = await setupOriginalAsset();
      const tokenId = await mintAsset(users[1].address, 1);
      await expect(originalAsset.collectionIndexOf(tokenId)).to.be.revertedWith(
        'no collection ever minted for that token'
      );
      // ERC1155 with supply == 1 is considered to be an "NFT" by the original Asset contract
    });

    it('user cannot extract an ERC1155 if supply == 1', async function () {
      const {users, mintAsset, Asset} = await setupOriginalAsset();
      const tokenId = await mintAsset(users[1].address, 1);
      await expect(
        Asset.extractERC721(tokenId, users[1].address)
      ).to.be.revertedWith('Not an ERC1155 Token');
    });

    it.skip('user can extract an ERC1155 if supply > 1', async function () {
      const {users, mintAsset, Asset} = await setupOriginalAsset();
      const tokenId = await mintAsset(users[1].address, 11);
      await Asset.extractERC721(tokenId, users[1].address); // TODO: reverts with `can't substract more than there is`
      // TestAsset.updateTokenBalance (src/solc_0.5/contracts_common/Libraries/ObjectLib32.sol:57)
    });

    it.skip('user can extract an ERC1155 if supply == 2', async function () {
      const {users, mintAsset, Asset} = await setupOriginalAsset();
      const tokenId = await mintAsset(users[1].address, 2);
      await Asset.extractERC721(tokenId, users[1].address); // TODO: reverts with `can't substract more than there is`
      await Asset.extractERC721(tokenId, users[1].address);
    });

    it.skip('user cannot extract an ERC1155 if supply == 2 but 1 has already been extracted', async function () {
      const {users, mintAsset, Asset} = await setupOriginalAsset();
      const tokenId = await mintAsset(users[1].address, 2);
      await Asset.extractERC721(tokenId, users[1].address); // TODO: reverts with `can't substract more than there is`
      await expect(
        Asset.extractERC721(tokenId, users[1].address)
      ).to.be.revertedWith(`xxx`);
    });

    it.skip('user can extract ERC721 more than once', async function () {
      const {users, mintAsset, Asset} = await setupOriginalAsset();
      const tokenId = await mintAsset(users[1].address, 3);
      await Asset.extractERC721(tokenId, users[1].address); // TODO: reverts with `can't substract more than there is`
      await Asset.extractERC721(tokenId, users[1].address);
    });
  });

  describe('tokenURI', function () {
    it('can get the URI for an asset of amount 1', async function () {
      const {Asset, users, mintAsset} = await setupOriginalAsset();
      const tokenId = await mintAsset(users[1].address, 1);
      const URI = await Asset.callStatic.tokenURI(tokenId); // uri ERC1155; tokenURI ERC721
      // const hash =
      //   '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e';
      // getHash2Base32(hash) ==> dyxh2cyiwdzczgbn4bk6g2gfi6qiamoqogw5bxxl5p6wu57g2ahy
      expect(URI).to.be.equal(
        'ipfs://bafybeidyxh2cyiwdzczgbn4bk6g2gfi6qiamoqogw5bxxl5p6wu57g2ahy/0.json'
      );
    });

    it('can get the URI for a FT', async function () {
      const {Asset, users, mintAsset} = await setupOriginalAsset();
      const tokenId = await mintAsset(users[1].address, 11);
      const URI = await Asset.callStatic.uri(tokenId); // uri ERC1155; tokenURI ERC721
      expect(URI).to.be.equal(
        'ipfs://bafybeidyxh2cyiwdzczgbn4bk6g2gfi6qiamoqogw5bxxl5p6wu57g2ahy/0.json'
      );
    });

    it('fails get the URI for an invalid tokeId', async function () {
      const {Asset} = await setupOriginalAsset();
      const tokenId = 42;
      await expect(Asset.callStatic.tokenURI(tokenId)).to.be.revertedWith(
        'NFT does not exist'
      );
    });
  });
});
