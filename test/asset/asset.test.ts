import {setupAsset} from './fixtures';
import {waitFor} from '../utils';
import {expect} from '../chai-setup';
import {sendMetaTx} from './sendMetaTx';

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

  describe('Asset: MetaTransactions', function () {
    it('metaaaaaa-TTT-X!', async function () {
      const {Asset, users} = await setupAsset();
      const {to, data} = await Asset.populateTransaction.mint();
      console.log('yo!');

      // await sendMetaTx();
    });
  });
});
