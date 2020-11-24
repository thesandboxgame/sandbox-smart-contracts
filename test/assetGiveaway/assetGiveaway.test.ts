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

  it('User can claim their allocated assets', async function () {
    const setUp = await setupGiveaway();

    // Add setup step to put assets in contract

    const {giveawayContract, others, tree, assets} = setUp;
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

  // giveaway contract can hold assets --> set up contract with assets in it
  // assets can be claimed from giveaway contract --> set up proof for user to claim assets

  // a different address can hold assets
  // assets can be claimed from that address
});
