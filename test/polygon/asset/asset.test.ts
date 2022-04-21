import {setupPolygonAsset} from './fixtures';

import {waitFor, getAssetChainIndex} from '../../utils';
import {expect} from '../../chai-setup';
import {sendMetaTx} from '../../sendMetaTx';
import {ethers} from 'hardhat';

describe('PolygonAsset.sol', function () {
  it('user sending asset to itself keep the same balance', async function () {
    const {PolygonAssetERC1155, users, mintAsset} = await setupPolygonAsset();
    const tokenId = await mintAsset(users[0].address, 10);
    await waitFor(
      PolygonAssetERC1155.connect(
        ethers.provider.getSigner(users[0].address)
      ).safeTransferFrom(users[0].address, users[0].address, tokenId, 10, '0x')
    );
    const balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
      users[0].address,
      tokenId
    );
    expect(balance).to.be.equal(10);
  });

  it('user batch sending asset to itself keep the same balance', async function () {
    const {PolygonAssetERC1155, users, mintAsset} = await setupPolygonAsset();
    const tokenId = await mintAsset(users[0].address, 20);
    await waitFor(
      PolygonAssetERC1155.connect(
        ethers.provider.getSigner(users[0].address)
      ).safeBatchTransferFrom(
        users[0].address,
        users[0].address,
        [tokenId],
        [10],
        '0x'
      )
    );
    const balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
      users[0].address,
      tokenId
    );
    expect(balance).to.be.equal(20);
  });

  it('user batch sending in series whose total is more than its balance', async function () {
    const {PolygonAssetERC1155, users, mintAsset} = await setupPolygonAsset();
    const tokenId = await mintAsset(users[0].address, 20);
    await waitFor(
      PolygonAssetERC1155.connect(
        ethers.provider.getSigner(users[0].address)
      ).safeBatchTransferFrom(
        users[0].address,
        users[0].address,
        [tokenId, tokenId, tokenId],
        [10, 20, 20],
        '0x'
      )
    );
    const balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
      users[0].address,
      tokenId
    );
    expect(balance).to.be.equal(20);
  });

  it('user batch sending more asset than it owns should fails', async function () {
    const {users, mintAsset, PolygonAssetERC1155} = await setupPolygonAsset();
    const tokenId = await mintAsset(users[0].address, 20);
    await expect(
      PolygonAssetERC1155.connect(
        ethers.provider.getSigner(users[0].address)
      ).safeBatchTransferFrom(
        users[0].address,
        users[0].address,
        [tokenId],
        [30],
        '0x'
      )
    ).to.be.revertedWith(`BALANCE_TOO_LOW`);
  });

  it('can get the chainIndex from the tokenId', async function () {
    const {users, mintAsset} = await setupPolygonAsset();
    const tokenId = await mintAsset(users[1].address, 11);
    const chainIndex = getAssetChainIndex(tokenId);
    expect(chainIndex).to.be.equal(1);
  });

  it('can get the URI for an asset with amount 1', async function () {
    const {PolygonAssetERC1155, users, mintAsset} = await setupPolygonAsset();
    const tokenId = await mintAsset(users[1].address, 1);
    const URI = await PolygonAssetERC1155.callStatic.tokenURI(tokenId);
    expect(URI).to.be.equal(
      'ipfs://bafybeidyxh2cyiwdzczgbn4bk6g2gfi6qiamoqogw5bxxl5p6wu57g2ahy/0.json'
    );
  });

  it('can get the URI for a FT', async function () {
    const {PolygonAssetERC1155, users, mintAsset} = await setupPolygonAsset();
    const tokenId = await mintAsset(users[1].address, 11);
    const URI = await PolygonAssetERC1155.callStatic.tokenURI(tokenId);
    expect(URI).to.be.equal(
      'ipfs://bafybeidyxh2cyiwdzczgbn4bk6g2gfi6qiamoqogw5bxxl5p6wu57g2ahy/0.json'
    );
  });

  it('fails get the URI for an invalid tokeId', async function () {
    const {PolygonAssetERC1155} = await setupPolygonAsset();
    const tokenId = 42;
    await expect(
      PolygonAssetERC1155.callStatic.tokenURI(tokenId)
    ).to.be.revertedWith('NFT_!EXIST_||_FT_!MINTED');
  });

  it('can burn ERC1155 asset', async function () {
    const {PolygonAssetERC1155, users, mintAsset} = await setupPolygonAsset();
    const tokenId = await mintAsset(users[0].address, 20);
    await waitFor(
      PolygonAssetERC1155.connect(
        ethers.provider.getSigner(users[0].address)
      ).burnFrom(users[0].address, tokenId, 10)
    );
    const balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
      users[0].address,
      tokenId
    );
    expect(balance).to.be.equal(10);
  });

  it('can mint and burn asset of amount 1', async function () {
    const {PolygonAssetERC1155, users, mintAsset} = await setupPolygonAsset();
    const tokenId = await mintAsset(users[0].address, 1);
    let balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
      users[0].address,
      tokenId
    );
    expect(balance).to.be.equal(1);
    await waitFor(
      PolygonAssetERC1155.connect(
        ethers.provider.getSigner(users[0].address)
      ).burnFrom(users[0].address, tokenId, 1)
    );
    balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
      users[0].address,
      tokenId
    );
    expect(balance).to.be.equal(0);
  });

  describe('PolygonAsset: MetaTransactions', function () {
    it('can transfer by metaTx', async function () {
      const {
        PolygonAssetERC1155,
        users,
        mintAsset,
        trustedForwarder,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(users[1].address, 11);

      const {to, data} = await PolygonAssetERC1155.populateTransaction[
        'safeTransferFrom(address,address,uint256,uint256,bytes)'
      ](users[1].address, users[2].address, tokenId, 10, '0x');

      await sendMetaTx(to, trustedForwarder, data, users[1].address);

      const balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        users[2].address,
        tokenId
      );
      expect(balance).to.be.equal(10);
    });

    it('fails to transfer someone else token by metaTx', async function () {
      const {
        PolygonAssetERC1155,
        users,
        mintAsset,
        trustedForwarder,
      } = await setupPolygonAsset();
      const tokenId = await mintAsset(users[1].address, 11);

      const {to, data} = await PolygonAssetERC1155.populateTransaction[
        'safeTransferFrom(address,address,uint256,uint256,bytes)'
      ](users[1].address, users[2].address, tokenId, 10, '0x');

      await sendMetaTx(to, trustedForwarder, data, users[2].address);

      const balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        users[2].address,
        tokenId
      );
      expect(balance).to.be.equal(0);
    });

    it('can batch-transfer by metaTx', async function () {
      const {
        PolygonAssetERC1155,
        users,
        mintAsset,
        trustedForwarder,
      } = await setupPolygonAsset();
      const tokenId1 = await mintAsset(users[1].address, 7);
      const tokenId2 = await mintAsset(users[1].address, 3);
      const tokenIds = [tokenId1, tokenId2];
      const values = [7, 3];

      const {to, data} = await PolygonAssetERC1155.populateTransaction[
        'safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)'
      ](users[1].address, users[2].address, tokenIds, values, '0x');

      await sendMetaTx(to, trustedForwarder, data, users[1].address);

      const balance1 = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        users[2].address,
        tokenId1
      );
      const balance2 = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        users[2].address,
        tokenId2
      );
      expect(balance1).to.be.equal(7);
      expect(balance2).to.be.equal(3);
    });
  });
});
