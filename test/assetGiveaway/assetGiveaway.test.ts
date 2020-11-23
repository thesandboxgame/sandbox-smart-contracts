import {ethers} from 'hardhat';
import {setupGiveaway} from './fixtures';
import {BigNumber, constants} from 'ethers';
import {
  expectEventWithArgs,
  expectReceiptEventWithArgs,
  waitFor,
} from '../utils';
import {expect} from '../chai-setup';

const zeroAddress = constants.AddressZero;

describe('NFT_Lottery_1', function () {
  it('exists', async function () {
    const setUp = await setupGiveaway();
    const {giveawayContract, others} = setUp;

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
