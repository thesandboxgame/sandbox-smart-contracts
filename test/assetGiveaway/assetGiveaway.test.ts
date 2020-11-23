import {ethers} from 'hardhat';
import {setupGiveaway} from './fixtures';
import {BigNumber, constants} from 'ethers';
import {
  expectEventWithArgs,
  expectReceiptEventWithArgs,
  waitFor,
} from '../utils';
import {expect} from '../chai-setup';

import MerkleTree from '../../lib/merkleTree';
import helpers from '../../lib/merkleTreeHelper';
const {calculateAssetHash} = helpers;

const zeroAddress = constants.AddressZero;

describe('NFT_Lottery_1', function () {
  it('exists', async function () {
    const setUp = await setupGiveaway();
    const {giveawayContract, others, tree} = setUp;

    console.log('user', others[1]);

    const asset = {
      reservedAddress: others[1],
      assetIds: [0, 1, 2],
      assetValues: [5, 5, 5],
    };

    const proof = tree.getProof(calculateAssetHash(asset));

    console.log('proof', proof);

    // TODO: tests for claim
    const receipt = await waitFor(
      giveawayContract.claimAssets(
        others[1],
        others[2],
        [0, 1, 2],
        [5, 5, 5],
        '0x'
      )
    );
  });

  // giveaway contract can hold assets --> set up contract with assets in it
  // assets can be claimed from giveaway contract --> set up proof for user to claim assets

  // a different address can hold assets
  // assets can be claimed from that address
});
