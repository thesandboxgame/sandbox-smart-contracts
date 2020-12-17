import {ethers} from 'hardhat';
import {setupTestGiveaway} from './fixtures';
import {constants} from 'ethers';
import {waitFor, expectReceiptEventWithArgs, increaseTime} from '../utils';
import {expect} from '../chai-setup';

import helpers from '../../lib/merkleTreeHelper';
const {calculateClaimableAssetHash} = helpers;

const zeroAddress = constants.AddressZero;

describe('GAS:Asset_Giveaway_1:Claiming', function () {
  const gasReport: any = {};
  function record(name: any, gasUsed: any) {
    gasReport[name] = gasUsed.toNumber(); // TODO average...
  }
  after(function () {
    console.log(JSON.stringify(gasReport, null, '  '));
  });

  it('User claims assets', async function () {
    const options = {
      assetsHolder: true,
      mint: true,
    };
    const setUp = await setupTestGiveaway(options);
    const {giveawayContract, others, tree, assets} = setUp;
    const asset = assets[0];
    const proof = tree.getProof(calculateClaimableAssetHash(asset));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[1])
    );

    const receipt = await waitFor(
      giveawayContractAsUser.claimAssets(
        others[1],
        asset.assetIds,
        asset.assetValues,
        proof,
        asset.salt
      )
    );
    record('singleClaimAssets', receipt.gasUsed);
  });
});
