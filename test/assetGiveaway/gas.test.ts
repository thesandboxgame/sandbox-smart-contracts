import {ethers} from 'hardhat';
import {setupTestGiveaway} from './fixtures';
import {waitFor} from '../utils';
import helpers from '../../lib/merkleTreeHelper';
const {calculateClaimableAssetHash} = helpers;

describe('GAS:Asset_Giveaway_1:Claiming', function () {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gasReport: any = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function record(name: any, gasUsed: any) {
    gasReport[name] = gasUsed.toNumber();
  }
  after(function () {
    console.log(JSON.stringify(gasReport, null, '  '));
  });

  it('1 claim', async function () {
    const options = {
      assetsHolder: true,
      mintSingleAsset: 1,
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
    record('Gas per claim - 1 claim total', receipt.gasUsed);
  });

  it('10 claims', async function () {
    const options = {
      assetsHolder: true,
      mintSingleAsset: 10,
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
    record('Gas per claim - 10 claims total', receipt.gasUsed);
  });

  it('4000 claims', async function () {
    const options = {
      assetsHolder: true,
      mintSingleAsset: 4000,
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
    record('Gas per claim - 4000 claims total', receipt.gasUsed);
  });

  it('10000 claims', async function () {
    const options = {
      assetsHolder: true,
      mintSingleAsset: 10000,
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
    record('Gas per claim - 10000 claims total', receipt.gasUsed);
  });
});
