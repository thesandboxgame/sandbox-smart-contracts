import {ethers} from 'hardhat';
import {setupTestGiveaway} from './fixtures';
import {constants} from 'ethers';
import {waitFor, expectReceiptEventWithArgs} from '../utils';
import {expect} from '../chai-setup';

import helpers from '../../lib/merkleTreeHelper';
const {calculateClaimableAssetHash} = helpers;

const zeroAddress = constants.AddressZero;

// eslint-disable-next-line mocha/no-skipped-tests
describe('Asset_Giveaway', function () {
  it('User cannot claim when test contract holds zero assets', async function () {
    const options = {
      assetsHolder: true,
    };
    const setUp = await setupTestGiveaway(options);
    const {giveawayContract, others, tree, assets} = setUp;
    const asset = assets[0];
    const proof = tree.getProof(calculateClaimableAssetHash(asset));
    const giveawayContractAsUser = giveawayContract.connect(
      ethers.provider.getSigner(others[0])
    );

    await expect(
      giveawayContractAsUser.claimAssets(
        others[0],
        asset.assetIds,
        asset.assetValues,
        proof,
        asset.salt
      )
    ).to.be.revertedWith(`can't substract more than there is`);
  });

  it('User can claim allocated multiple assets for multiple assetIds from Giveaway contract', async function () {
    const options = {
      mint: true,
    };
    const setUp = await setupTestGiveaway(options);
    const {giveawayContract, others, tree, assets, assetContract} = setUp;

    const asset = assets[0];

    const proof = tree.getProof(calculateClaimableAssetHash(asset));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[0])
    );

    const initBalanceAssetId1 = await assetContract[
      'balanceOf(address,uint256)'
    ](giveawayContract.address, asset.assetIds[0]);
    expect(initBalanceAssetId1).to.equal(asset.assetValues[0]);
    const initBalanceAssetId2 = await assetContract[
      'balanceOf(address,uint256)'
    ](giveawayContract.address, asset.assetIds[1]);
    expect(initBalanceAssetId2).to.equal(asset.assetValues[1]);
    const initBalanceAssetId3 = await assetContract[
      'balanceOf(address,uint256)'
    ](giveawayContract.address, asset.assetIds[2]);
    expect(initBalanceAssetId3).to.equal(asset.assetValues[2]);

    await waitFor(
      giveawayContractAsUser.claimAssets(
        others[0],
        asset.assetIds,
        asset.assetValues,
        proof,
        asset.salt
      )
    );

    const balanceAssetId1 = await assetContract['balanceOf(address,uint256)'](
      others[0],
      asset.assetIds[0]
    );
    expect(balanceAssetId1).to.equal(asset.assetValues[0]);
    const balanceAssetId2 = await assetContract['balanceOf(address,uint256)'](
      others[0],
      asset.assetIds[1]
    );
    expect(balanceAssetId2).to.equal(asset.assetValues[1]);
    const balanceAssetId3 = await assetContract['balanceOf(address,uint256)'](
      others[0],
      asset.assetIds[2]
    );
    expect(balanceAssetId3).to.equal(asset.assetValues[2]);
  });

  it('Claimed Event is emitted for successful claim', async function () {
    const options = {
      mint: true,
    };
    const setUp = await setupTestGiveaway(options);
    const {giveawayContract, others, tree, assets} = setUp;

    const asset = assets[0];
    const proof = tree.getProof(calculateClaimableAssetHash(asset));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[0])
    );

    const receipt = await waitFor(
      giveawayContractAsUser.claimAssets(
        others[0],
        asset.assetIds,
        asset.assetValues,
        proof,
        asset.salt
      )
    );

    const claimedEvent = await expectReceiptEventWithArgs(
      receipt,
      'ClaimedAssets'
    );

    expect(claimedEvent.args[0]).to.equal(others[0]); // to
    expect(claimedEvent.args[1][0]).to.equal(asset.assetIds[0]);
    expect(claimedEvent.args[1][1]).to.equal(asset.assetIds[1]);
    expect(claimedEvent.args[1][2]).to.equal(asset.assetIds[2]);
    expect(claimedEvent.args[2][0]).to.equal(asset.assetValues[0]);
    expect(claimedEvent.args[2][1]).to.equal(asset.assetValues[1]);
    expect(claimedEvent.args[2][2]).to.equal(asset.assetValues[2]);
  });

  it('User can claim allocated single asset for single assetId from Giveaway contract', async function () {
    const options = {
      mint: true,
    };
    const setUp = await setupTestGiveaway(options);
    const {giveawayContract, others, tree, assets} = setUp;

    const asset = assets[1];
    const proof = tree.getProof(calculateClaimableAssetHash(asset));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[0])
    );

    await waitFor(
      giveawayContractAsUser.claimAssets(
        others[0],
        asset.assetIds,
        asset.assetValues,
        proof,
        asset.salt
      )
    );
  });

  it('User tries to claim the wrong amount of an assetID', async function () {
    const options = {
      mint: true,
    };
    const setUp = await setupTestGiveaway(options);
    const {giveawayContract, others, tree, assets} = setUp;

    const asset = assets[1];
    const proof = tree.getProof(calculateClaimableAssetHash(asset));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[0])
    );

    await expect(
      giveawayContractAsUser.claimAssets(
        others[0],
        asset.assetIds,
        [0], // bad param
        proof,
        asset.salt
      )
    ).to.be.revertedWith('INVALID_CLAIM');
  });

  it('User cannot claim their assets more than once', async function () {
    const options = {
      mint: true,
    };
    const setUp = await setupTestGiveaway(options);
    const {giveawayContract, others, tree, assets} = setUp;

    const asset = assets[0];
    const proof = tree.getProof(calculateClaimableAssetHash(asset));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[0])
    );

    await waitFor(
      giveawayContractAsUser.claimAssets(
        others[0],
        asset.assetIds,
        asset.assetValues,
        proof,
        asset.salt
      )
    );
    await expect(
      giveawayContractAsUser.claimAssets(
        others[0],
        asset.assetIds,
        asset.assetValues,
        proof,
        asset.salt
      )
    ).to.be.revertedWith('DESTINATION_ALREADY_CLAIMED');
  });

  it('User cannot claim assets from Giveaway contract if destination is not the reserved address', async function () {
    const options = {
      mint: true,
    };
    const setUp = await setupTestGiveaway(options);
    const {giveawayContract, others, tree, assets} = setUp;

    const asset = assets[0];
    const proof = tree.getProof(calculateClaimableAssetHash(asset));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[0])
    );

    await expect(
      giveawayContractAsUser.claimAssets(
        others[1], // bad param
        asset.assetIds,
        asset.assetValues,
        proof,
        asset.salt
      )
    ).to.be.revertedWith('INVALID_CLAIM');
  });

  it('User cannot claim assets from Giveaway contract to destination zeroAddress', async function () {
    const options = {
      mint: true,
    };
    const setUp = await setupTestGiveaway(options);
    const {giveawayContract, others, tree, assets} = setUp;

    const asset = assets[0];
    const proof = tree.getProof(calculateClaimableAssetHash(asset));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[0])
    );

    await expect(
      giveawayContractAsUser.claimAssets(
        zeroAddress,
        asset.assetIds,
        asset.assetValues,
        proof,
        asset.salt
      )
    ).to.be.revertedWith('INVALID_TO_ZERO_ADDRESS');
  });
  it('User cannot claim assets from Giveaway contract with incorrect asset param', async function () {
    const options = {
      mint: true,
    };
    const setUp = await setupTestGiveaway(options);
    const {giveawayContract, others, tree, assets} = setUp;

    const asset = assets[0];
    const proof = tree.getProof(calculateClaimableAssetHash(asset));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[0])
    );

    await expect(
      giveawayContractAsUser.claimAssets(
        others[0],
        asset.assetIds,
        [5, 5], // length too short
        proof,
        asset.salt
      )
    ).to.be.revertedWith('INVALID_INPUT');
  });

  it('User can claim allocated multiple assets for multiple assetIds from alternate address', async function () {
    const options = {
      mint: true,
      assetsHolder: true, // others[5]
    };
    const setUp = await setupTestGiveaway(options);
    const {giveawayContract, others, tree, assets, assetContract} = setUp;

    const asset = assets[0];
    const proof = tree.getProof(calculateClaimableAssetHash(asset));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[0])
    );

    const initBalanceAssetId1 = await assetContract[
      'balanceOf(address,uint256)'
    ](others[5], asset.assetIds[0]);
    expect(initBalanceAssetId1).to.equal(asset.assetValues[0]);
    const initBalanceAssetId2 = await assetContract[
      'balanceOf(address,uint256)'
    ](others[5], asset.assetIds[1]);
    expect(initBalanceAssetId2).to.equal(asset.assetValues[1]);
    const initBalanceAssetId3 = await assetContract[
      'balanceOf(address,uint256)'
    ](others[5], asset.assetIds[2]);
    expect(initBalanceAssetId3).to.equal(asset.assetValues[2]);

    await waitFor(
      giveawayContractAsUser.claimAssets(
        others[0],
        asset.assetIds,
        asset.assetValues,
        proof,
        asset.salt
      )
    );

    const balanceAssetId1 = await assetContract['balanceOf(address,uint256)'](
      others[0],
      asset.assetIds[0]
    );
    expect(balanceAssetId1).to.equal(asset.assetValues[0]);
    const balanceAssetId2 = await assetContract['balanceOf(address,uint256)'](
      others[0],
      asset.assetIds[1]
    );
    expect(balanceAssetId2).to.equal(asset.assetValues[1]);
    const balanceAssetId3 = await assetContract['balanceOf(address,uint256)'](
      others[0],
      asset.assetIds[2]
    );
    expect(balanceAssetId3).to.equal(asset.assetValues[2]);
  });

  it('merkleRoot cannot be set twice', async function () {
    const options = {};
    const setUp = await setupTestGiveaway(options);
    const {giveawayContract, nftGiveawayAdmin} = setUp;

    const giveawayContractAsAdmin = await giveawayContract.connect(
      ethers.provider.getSigner(nftGiveawayAdmin)
    );

    await expect(
      giveawayContractAsAdmin.setMerkleRoot(
        '0x0000000000000000000000000000000000000000000000000000000000000000'
      )
    ).to.be.revertedWith('MERKLE_ROOT_ALREADY_SET');
  });

  it('merkleRoot can only be set by admin', async function () {
    const options = {};
    const setUp = await setupTestGiveaway(options);
    const {giveawayContract, others} = setUp;

    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[8])
    );

    await expect(
      giveawayContractAsUser.setMerkleRoot(
        '0x0000000000000000000000000000000000000000000000000000000000000000'
      )
    ).to.be.revertedWith('ADMIN_ONLY');
  });

  // NOT USED BECAUSE NO EXPIRY
  // it('User cannot claim assets after the expiryTime', async function () {
  //   const options = {};
  //   const setUp = await setupTestGiveaway(options);
  //   const {giveawayContract, others, tree, assets} = setUp;

  //   const asset = assets[0];
  //   const proof = tree.getProof(calculateClaimableAssetHash(asset));
  //   const giveawayContractAsUser = await giveawayContract.connect(
  //     ethers.provider.getSigner(others[0])
  //   );

  //   await increaseTime(60 * 60 * 24 * 30 * 4);

  //   await expect(
  //     giveawayContractAsUser.claimAssets(
  //       others[0],
  //       asset.assetIds,
  //       asset.assetValues,
  //       proof,
  //       asset.salt
  //     )
  //   ).to.be.revertedWith('CLAIM_PERIOD_IS_OVER');
  // });
});
