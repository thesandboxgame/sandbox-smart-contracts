import {ethers} from 'hardhat';
import {setupGiveaway} from './fixtures';
import {BigNumber, constants} from 'ethers';
import {
  expectEventWithArgs,
  expectReceiptEventWithArgs,
  waitFor,
} from '../utils';
import {expect} from '../chai-setup';

import helpers from '../../lib/merkleTreeHelper';
const {calculateAssetHash} = helpers;

const zeroAddress = constants.AddressZero;

describe('NFT_Lottery_1', function () {
  it('User cannot claim when contract holds zero assets', async function () {
    const setUp = await setupGiveaway();
    const {giveawayContract, others, tree, assets} = setUp;
    const asset = assets[0];
    const proof = tree.getProof(calculateAssetHash(asset));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[1])
    );

    await expect(
      giveawayContractAsUser.claimAssets(
        others[1],
        others[1],
        [0, 1, 2],
        [5, 5, 5],
        proof,
        asset.salt
      )
    ).to.be.revertedWith(`can't substract more than there is`);
  });

  it('User can claim their allocated assets from Giveaway contract', async function () {
    const setUp = await setupGiveaway();
    const {
      giveawayContract,
      others,
      tree,
      assets,
      mintTestAssets,
      assetContract,
    } = setUp;
    console.log(assetContract);

    for (let i = 0; i < 3; i++) {
      await mintTestAssets(i, 5, giveawayContract.address);
    }

    // TODO: fix balanceOf; check contract receives assets
    // const balanceA = await assetContract.balanceOf(giveawayContract.address, 0);
    // console.log('bal', balanceA);

    // Correct asset supply numbers

    const asset = assets[0];
    const proof = tree.getProof(calculateAssetHash(asset));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[1])
    );

    await waitFor(
      giveawayContractAsUser.claimAssets(
        others[1],
        others[1],
        [0, 1, 2],
        [5, 5, 5],
        proof,
        asset.salt
      )
    );
  });

  // a different address can hold assets
  // assets can be claimed from that address
});
