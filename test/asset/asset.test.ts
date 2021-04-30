import {setupAsset} from './fixtures';
import {constants, BigNumber} from 'ethers';
import {waitFor} from '../utils';
import {expect} from '../chai-setup';
import {sendMetaTx} from './sendMetaTx';

const defaultRequest = {
  from: constants.AddressZero,
  to: constants.AddressZero,
  value: '0',
  gas: '10000',
  data: '0x',
};

describe('Asset.sol', function () {
  it('user sending asset to itself keep the same balance', async function () {
    const {Asset, users, mintAsset} = await setupAsset();
    const tokenId = await mintAsset(users[0].address, 20);
    await waitFor(
      users[0].Asset['safeTransferFrom(address,address,uint256,uint256,bytes)'](
        users[0].address,
        users[0].address,
        tokenId,
        10,
        '0x'
      )
    );
    const balance = await Asset['balanceOf(address,uint256)'](
      users[0].address,
      tokenId
    );
    expect(balance).to.be.equal(20);
  });

  it('user batch sending asset to itself keep the same balance', async function () {
    const {Asset, users, mintAsset} = await setupAsset();
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
    const {Asset, users, mintAsset} = await setupAsset();
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
    const {users, mintAsset} = await setupAsset();
    const tokenId = await mintAsset(users[0].address, 20);
    await expect(
      users[0].Asset.safeBatchTransferFrom(
        users[0].address,
        users[0].address,
        [tokenId],
        [30],
        '0x'
      )
    ).to.be.revertedWith(`BALANCE_TOO_LOW`);
  });

  it('can get the chainIndex from the tokenId', async function () {
    const {Asset, users, mintAsset} = await setupAsset();
    const tokenId = await mintAsset(users[1].address, 11);
    const chainIndex = await Asset.callStatic.chainIndex(tokenId);
    expect(chainIndex).to.be.equal(0);
  });

  it('can get the URI for an NFT', async function () {
    const {Asset, users, mintAsset} = await setupAsset();
    const tokenId = await mintAsset(users[1].address, 1);
    const URI = await Asset.callStatic.tokenURI(tokenId);
    expect(URI).to.be.equal(
      'ipfs://bafybeidyxh2cyiwdzczgbn4bk6g2gfi6qiamoqogw5bxxl5p6wu57g2ahy/0.json'
    );
  });

  it('can get the URI for a FT', async function () {
    const {Asset, users, mintAsset} = await setupAsset();
    const tokenId = await mintAsset(users[1].address, 11);
    const URI = await Asset.callStatic.tokenURI(tokenId);
    expect(URI).to.be.equal(
      'ipfs://bafybeidyxh2cyiwdzczgbn4bk6g2gfi6qiamoqogw5bxxl5p6wu57g2ahy/0.json'
    );
  });

  it('fails get the URI for an invalid tokeId', async function () {
    const {Asset} = await setupAsset();
    const tokenId = 42;
    await expect(Asset.callStatic.tokenURI(tokenId)).to.be.revertedWith(
      'NFT_!EXIST_||_FT_!MINTED'
    );
  });

  describe('Asset: MetaTransactions', function () {
    it('can transfer by metaTx', async function () {
      const {Asset, users, mintAsset, forwarder} = await setupAsset();
      const tokenId = await mintAsset(users[1].address, 11);

      const {to, data} = await Asset.populateTransaction[
        'safeTransferFrom(address,address,uint256,uint256,bytes)'
      ](users[1].address, users[2].address, tokenId, 10, '0x');

      await sendMetaTx(to, forwarder, data, users[1].address);

      const balance = await Asset['balanceOf(address,uint256)'](
        users[2].address,
        tokenId
      );
      expect(balance).to.be.equal(10);
    });

    it('fails to transfer someone else token by metaTx', async function () {
      const {Asset, users, mintAsset, forwarder} = await setupAsset();
      const tokenId = await mintAsset(users[1].address, 11);

      const {to, data} = await Asset.populateTransaction[
        'safeTransferFrom(address,address,uint256,uint256,bytes)'
      ](users[1].address, users[2].address, tokenId, 10, '0x');

      // users[2] trys to transfer users[1]'s token
      await sendMetaTx(to, forwarder, data, users[2].address);

      const balance = await Asset['balanceOf(address,uint256)'](
        users[2].address,
        tokenId
      );
      // but it fails, and balance is not 10
      expect(balance).to.be.equal(0);
    });

    it('can batch-transfer by metaTx', async function () {
      const {Asset, users, mintAsset, forwarder} = await setupAsset();
      const tokenId1 = await mintAsset(users[1].address, 7);
      const tokenId2 = await mintAsset(users[1].address, 3);
      const tokenIds = [tokenId1, tokenId2];
      const values = [7, 3];

      const {to, data} = await Asset.populateTransaction[
        'safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)'
      ](users[1].address, users[2].address, tokenIds, values, '0x');

      await sendMetaTx(to, forwarder, data, users[1].address);

      const balance1 = await Asset['balanceOf(address,uint256)'](
        users[2].address,
        tokenId1
      );
      const balance2 = await Asset['balanceOf(address,uint256)'](
        users[2].address,
        tokenId2
      );
      expect(balance1).to.be.equal(7);
      expect(balance2).to.be.equal(3);
    });
  });

  describe('Asset: Matic Integration', function () {
    it('should fail if called by other than predicate', async function () {
      // @note enhance dummy predicate to use actual predicate code
      const {Asset, users} = await setupAsset();

      await expect(
        Asset.mintBatch(users[1].address, [11], [3], '0x')
      ).to.be.revertedWith('!PREDICATE');
    });

    it('predicate can call mintBatch with a single NFT', async function () {
      const {Asset, users, predicate} = await setupAsset();
      const tokenId = 1111111111;
      const {to, data} = await Asset.populateTransaction[
        'mintBatch(address,uint256[],uint256[],bytes)'
      ](users[1].address, [tokenId], [1], '0x');

      await predicate.forward({
        ...defaultRequest,
        to: to,
        data: data,
        gas: '1000000',
      });

      expect(await Asset.ownerOf(tokenId)).to.be.equal(users[1].address);
    });

    it('predicate can call mintBatch with FTs', async function () {
      const {Asset, users, predicate} = await setupAsset();
      const tokenId = BigNumber.from(
        '0x23618e81e3f5cdf7f54c3d65f7fbc0abf5b21e8f000000008000000000800800'
      );
      const {to, data} = await Asset.populateTransaction[
        'mintBatch(address,uint256[],uint256[],bytes)'
      ](users[1].address, [tokenId], [3], '0x');

      const wasMintedBefore = await Asset.wasEverMinted(tokenId);
      const balanceBefore = await Asset['balanceOf(address,uint256)'](
        users[1].address,
        tokenId
      );

      await waitFor(
        predicate.forward({
          ...defaultRequest,
          to: to,
          data: data,
          gas: '1000000',
        })
      );

      const wasMintedAfter = await Asset.wasEverMinted(tokenId);
      const balanceAfter = await Asset['balanceOf(address,uint256)'](
        users[1].address,
        tokenId
      );

      expect(wasMintedBefore).to.be.equal(false);
      expect(balanceBefore).to.be.equal(0);
      expect(wasMintedAfter).to.be.equal(true);
      expect(balanceAfter).to.be.equal(3);
    });
  });
});
