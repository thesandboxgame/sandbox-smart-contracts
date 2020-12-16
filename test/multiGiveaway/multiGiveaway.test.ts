import {ethers} from 'hardhat';
import {setupTestGiveaway} from './fixtures';
import {constants} from 'ethers';
import {waitFor, expectReceiptEventWithArgs, increaseTime} from '../utils';
import {expect} from '../chai-setup';

import helpers from '../../lib/merkleTreeHelper';
const {calculateClaimableAssetAndLandHash} = helpers;

const zeroAddress = constants.AddressZero;

describe('Multi_Giveaway_1', function () {
  it('User cannot claim when test contract holds zero assets/lands', async function () {
    const options = {
      assetsHolder: true,
      landHolder: true,
    };
    const setUp = await setupTestGiveaway(options);
    const {giveawayContract, others, tree, claims} = setUp;
    const claim = claims[0];
    const proof = tree.getProof(calculateClaimableAssetAndLandHash(claim));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[1])
    );

    await expect(
      giveawayContractAsUser.claimAssetsAndLands(
        others[1],
        claim.assetIds,
        claim.assetValues,
        claim.landIds,
        proof,
        claim.salt
      )
    ).to.be.revertedWith(`can't substract more than there is`);
  });

  it('User can claim allocated multiple assets for multiple assetIds together with lands from Giveaway contract', async function () {
    const options = {
      mint: true,
    };
    const setUp = await setupTestGiveaway(options);
    const {
      giveawayContract,
      others,
      tree,
      claims,
      assetContract,
      landContract,
    } = setUp;

    const claim = claims[0];

    const proof = tree.getProof(calculateClaimableAssetAndLandHash(claim));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[1])
    );

    const initBalanceAssetId1 = await assetContract[
      'balanceOf(address,uint256)'
    ](giveawayContract.address, claim.assetIds[0]);
    expect(initBalanceAssetId1).to.equal(claim.assetValues[0]);
    const initBalanceAssetId2 = await assetContract[
      'balanceOf(address,uint256)'
    ](giveawayContract.address, claim.assetIds[1]);
    expect(initBalanceAssetId2).to.equal(claim.assetValues[1]);
    const initBalanceAssetId3 = await assetContract[
      'balanceOf(address,uint256)'
    ](giveawayContract.address, claim.assetIds[2]);
    expect(initBalanceAssetId3).to.equal(claim.assetValues[2]);

    const originalOwnerLandId1 = await landContract.ownerOf(0);
    expect(originalOwnerLandId1).to.equal(giveawayContract.address);
    const originalOwnerLandId2 = await landContract.ownerOf(1);
    expect(originalOwnerLandId2).to.equal(giveawayContract.address);
    const originalOwnerLandId3 = await landContract.ownerOf(2);
    expect(originalOwnerLandId3).to.equal(giveawayContract.address);
    const originalOwnerLandId4 = await landContract.ownerOf(3);
    expect(originalOwnerLandId4).to.equal(giveawayContract.address);
    const originalOwnerLandId5 = await landContract.ownerOf(4);
    expect(originalOwnerLandId5).to.equal(giveawayContract.address);

    await waitFor(
      giveawayContractAsUser.claimAssetsAndLands(
        others[1],
        claim.assetIds,
        claim.assetValues,
        claim.landIds,
        proof,
        claim.salt
      )
    );

    const balanceAssetId1 = await assetContract['balanceOf(address,uint256)'](
      others[1],
      claim.assetIds[0]
    );
    expect(balanceAssetId1).to.equal(claim.assetValues[0]);
    const balanceAssetId2 = await assetContract['balanceOf(address,uint256)'](
      others[1],
      claim.assetIds[1]
    );
    expect(balanceAssetId2).to.equal(claim.assetValues[1]);
    const balanceAssetId3 = await assetContract['balanceOf(address,uint256)'](
      others[1],
      claim.assetIds[2]
    );
    expect(balanceAssetId3).to.equal(claim.assetValues[2]);

    const ownerLandId1 = await landContract.ownerOf(0);
    expect(ownerLandId1).to.equal(claim.reservedAddress);
    const ownerLandId2 = await landContract.ownerOf(1);
    expect(ownerLandId2).to.equal(claim.reservedAddress);
    const ownerLandId3 = await landContract.ownerOf(2);
    expect(ownerLandId3).to.equal(claim.reservedAddress);
    const ownerLandId4 = await landContract.ownerOf(3);
    expect(ownerLandId4).to.equal(claim.reservedAddress);
    const ownerLandId5 = await landContract.ownerOf(4);
    expect(ownerLandId5).to.equal(claim.reservedAddress);
  });

  it('Claimed Event is emitted for successful claim', async function () {
    const options = {
      mint: true,
    };
    const setUp = await setupTestGiveaway(options);
    const {giveawayContract, others, tree, claims} = setUp;

    const claim = claims[0];
    const proof = tree.getProof(calculateClaimableAssetAndLandHash(claim));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[1])
    );

    const receipt = await waitFor(
      giveawayContractAsUser.claimAssetsAndLands(
        others[1],
        claim.assetIds,
        claim.assetValues,
        claim.landIds,
        proof,
        claim.salt
      )
    );

    const claimedEvent = await expectReceiptEventWithArgs(
      receipt,
      'ClaimedAssetsAndLands'
    );

    expect(claimedEvent.args[0]).to.equal(others[1]); // to
    expect(claimedEvent.args[1][0]).to.equal(claim.assetIds[0]);
    expect(claimedEvent.args[1][1]).to.equal(claim.assetIds[1]);
    expect(claimedEvent.args[1][2]).to.equal(claim.assetIds[2]);
    expect(claimedEvent.args[2][0]).to.equal(claim.assetValues[0]);
    expect(claimedEvent.args[2][1]).to.equal(claim.assetValues[1]);
    expect(claimedEvent.args[2][2]).to.equal(claim.assetValues[2]);
    expect(claimedEvent.args[3][0]).to.equal(claim.landIds[0]);
    expect(claimedEvent.args[3][1]).to.equal(claim.landIds[1]);
    expect(claimedEvent.args[3][2]).to.equal(claim.landIds[2]);
    expect(claimedEvent.args[3][3]).to.equal(claim.landIds[3]);
    expect(claimedEvent.args[3][4]).to.equal(claim.landIds[4]);
  });

  it('User can claim allocated single asset for single assetId and single land from Giveaway contract', async function () {
    const options = {
      mint: true,
    };
    const setUp = await setupTestGiveaway(options);
    const {giveawayContract, others, tree, claims} = setUp;

    const claim = claims[1];
    const proof = tree.getProof(calculateClaimableAssetAndLandHash(claim));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[1])
    );

    await waitFor(
      giveawayContractAsUser.claimAssetsAndLands(
        others[1],
        claim.assetIds,
        claim.assetValues,
        claim.landIds,
        proof,
        claim.salt
      )
    );
  });

  it('User can claim allocated lands (when there are no assets allocated) from Giveaway contract', async function () {
    const options = {
      mint: true,
    };
    const setUp = await setupTestGiveaway(options);
    const {giveawayContract, others, tree, claims, landContract} = setUp;

    const claim = claims[2];
    const proof = tree.getProof(calculateClaimableAssetAndLandHash(claim));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[1])
    );

    const originalOwnerLandId1 = await landContract.ownerOf(0);
    expect(originalOwnerLandId1).to.equal(giveawayContract.address);

    await waitFor(
      giveawayContractAsUser.claimAssetsAndLands(
        others[1],
        [],
        [],
        claim.landIds,
        proof,
        claim.salt
      )
    );

    const ownerLandId1 = await landContract.ownerOf(7);
    expect(ownerLandId1).to.equal(claim.reservedAddress);
  });

  it('User can claim allocated assets (when there are no lands allocated) from Giveaway contract', async function () {
    const options = {
      mint: true,
    };
    const setUp = await setupTestGiveaway(options);
    const {giveawayContract, others, tree, claims, assetContract} = setUp;

    const claim = claims[3];
    const proof = tree.getProof(calculateClaimableAssetAndLandHash(claim));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[1])
    );

    const initBalanceAssetId1 = await assetContract[
      'balanceOf(address,uint256)'
    ](giveawayContract.address, claim.assetIds[0]);
    expect(initBalanceAssetId1).to.equal(claim.assetValues[0]);
    const initBalanceAssetId2 = await assetContract[
      'balanceOf(address,uint256)'
    ](giveawayContract.address, claim.assetIds[1]);
    expect(initBalanceAssetId2).to.equal(claim.assetValues[1]);
    const initBalanceAssetId3 = await assetContract[
      'balanceOf(address,uint256)'
    ](giveawayContract.address, claim.assetIds[2]);
    expect(initBalanceAssetId3).to.equal(claim.assetValues[2]);

    await waitFor(
      giveawayContractAsUser.claimAssetsAndLands(
        others[1],
        claim.assetIds,
        claim.assetValues,
        [],
        proof,
        claim.salt
      )
    );

    const balanceAssetId1 = await assetContract['balanceOf(address,uint256)'](
      others[1],
      claim.assetIds[0]
    );
    expect(balanceAssetId1).to.equal(claim.assetValues[0]);
    const balanceAssetId2 = await assetContract['balanceOf(address,uint256)'](
      others[1],
      claim.assetIds[1]
    );
    expect(balanceAssetId2).to.equal(claim.assetValues[1]);
    const balanceAssetId3 = await assetContract['balanceOf(address,uint256)'](
      others[1],
      claim.assetIds[2]
    );
    expect(balanceAssetId3).to.equal(claim.assetValues[2]);
  });

  it('User tries to claim the wrong amount of an assetID', async function () {
    const options = {
      mint: true,
    };
    const setUp = await setupTestGiveaway(options);
    const {giveawayContract, others, tree, claims} = setUp;

    const claim = claims[1];
    const proof = tree.getProof(calculateClaimableAssetAndLandHash(claim));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[1])
    );

    await expect(
      giveawayContractAsUser.claimAssetsAndLands(
        others[1],
        claim.assetIds,
        [0], // bad param
        claim.landIds,
        proof,
        claim.salt
      )
    ).to.be.revertedWith('INVALID_CLAIM');
  });

  it('User cannot claim more than once', async function () {
    const options = {
      mint: true,
    };
    const setUp = await setupTestGiveaway(options);
    const {giveawayContract, others, tree, claims} = setUp;

    const claim = claims[0];
    const proof = tree.getProof(calculateClaimableAssetAndLandHash(claim));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[1])
    );

    await waitFor(
      giveawayContractAsUser.claimAssetsAndLands(
        others[1],
        claim.assetIds,
        claim.assetValues,
        claim.landIds,
        proof,
        claim.salt
      )
    );
    await expect(
      giveawayContractAsUser.claimAssetsAndLands(
        others[1],
        claim.assetIds,
        claim.assetValues,
        claim.landIds,
        proof,
        claim.salt
      )
    ).to.be.revertedWith('DESTINATION_ALREADY_CLAIMED');
  });

  it('User cannot claim assets from Giveaway contract if destination is not the reserved address', async function () {
    const options = {
      mint: true,
    };
    const setUp = await setupTestGiveaway(options);
    const {giveawayContract, others, tree, claims} = setUp;

    const claim = claims[0];
    const proof = tree.getProof(calculateClaimableAssetAndLandHash(claim));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[1])
    );

    await expect(
      giveawayContractAsUser.claimAssetsAndLands(
        others[2], // bad param
        claim.assetIds,
        claim.assetValues,
        claim.landIds,
        proof,
        claim.salt
      )
    ).to.be.revertedWith('INVALID_CLAIM');
  });

  it('User cannot claim from Giveaway contract to destination zeroAddress', async function () {
    const options = {
      mint: true,
    };
    const setUp = await setupTestGiveaway(options);
    const {giveawayContract, others, tree, claims} = setUp;

    const claim = claims[0];
    const proof = tree.getProof(calculateClaimableAssetAndLandHash(claim));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[1])
    );

    await expect(
      giveawayContractAsUser.claimAssetsAndLands(
        zeroAddress,
        claim.assetIds,
        claim.assetValues,
        claim.landIds,
        proof,
        claim.salt
      )
    ).to.be.revertedWith('INVALID_TO_ZERO_ADDRESS');
  });

  it('User cannot claim assets from Giveaway contract with incorrect asset param', async function () {
    const options = {
      mint: true,
    };
    const setUp = await setupTestGiveaway(options);
    const {giveawayContract, others, tree, claims} = setUp;

    const claim = claims[0];
    const proof = tree.getProof(calculateClaimableAssetAndLandHash(claim));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[1])
    );

    await expect(
      giveawayContractAsUser.claimAssetsAndLands(
        others[1],
        claim.assetIds,
        [5, 5], // length too short
        claim.landIds,
        proof,
        claim.salt
      )
    ).to.be.revertedWith('INVALID_INPUT');
  });

  it('User can claim allocated multiple assets for multiple assetIds from alternate address, but landHolder is Giveaway contract', async function () {
    const options = {
      mint: true,
      assetsHolder: true, // others[5]
    };
    const setUp = await setupTestGiveaway(options);
    const {
      giveawayContract,
      others,
      tree,
      claims,
      assetContract,
      landContract,
    } = setUp;

    const claim = claims[0];
    const proof = tree.getProof(calculateClaimableAssetAndLandHash(claim));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[1])
    );

    const initBalanceAssetId1 = await assetContract[
      'balanceOf(address,uint256)'
    ](others[5], claim.assetIds[0]);
    expect(initBalanceAssetId1).to.equal(claim.assetValues[0]);
    const initBalanceAssetId2 = await assetContract[
      'balanceOf(address,uint256)'
    ](others[5], claim.assetIds[1]);
    expect(initBalanceAssetId2).to.equal(claim.assetValues[1]);
    const initBalanceAssetId3 = await assetContract[
      'balanceOf(address,uint256)'
    ](others[5], claim.assetIds[2]);
    expect(initBalanceAssetId3).to.equal(claim.assetValues[2]);

    const originalOwnerLandId1 = await landContract.ownerOf(0);
    expect(originalOwnerLandId1).to.equal(giveawayContract.address);
    const originalOwnerLandId2 = await landContract.ownerOf(1);
    expect(originalOwnerLandId2).to.equal(giveawayContract.address);
    const originalOwnerLandId3 = await landContract.ownerOf(2);
    expect(originalOwnerLandId3).to.equal(giveawayContract.address);
    const originalOwnerLandId4 = await landContract.ownerOf(3);
    expect(originalOwnerLandId4).to.equal(giveawayContract.address);
    const originalOwnerLandId5 = await landContract.ownerOf(4);
    expect(originalOwnerLandId5).to.equal(giveawayContract.address);

    await waitFor(
      giveawayContractAsUser.claimAssetsAndLands(
        others[1],
        claim.assetIds,
        claim.assetValues,
        claim.landIds,
        proof,
        claim.salt
      )
    );

    const balanceAssetId1 = await assetContract['balanceOf(address,uint256)'](
      others[1],
      claim.assetIds[0]
    );
    expect(balanceAssetId1).to.equal(claim.assetValues[0]);
    const balanceAssetId2 = await assetContract['balanceOf(address,uint256)'](
      others[1],
      claim.assetIds[1]
    );
    expect(balanceAssetId2).to.equal(claim.assetValues[1]);
    const balanceAssetId3 = await assetContract['balanceOf(address,uint256)'](
      others[1],
      claim.assetIds[2]
    );
    expect(balanceAssetId3).to.equal(claim.assetValues[2]);

    const ownerLandId1 = await landContract.ownerOf(0);
    expect(ownerLandId1).to.equal(claim.reservedAddress);
    const ownerLandId2 = await landContract.ownerOf(1);
    expect(ownerLandId2).to.equal(claim.reservedAddress);
    const ownerLandId3 = await landContract.ownerOf(2);
    expect(ownerLandId3).to.equal(claim.reservedAddress);
    const ownerLandId4 = await landContract.ownerOf(3);
    expect(ownerLandId4).to.equal(claim.reservedAddress);
    const ownerLandId5 = await landContract.ownerOf(4);
    expect(ownerLandId5).to.equal(claim.reservedAddress);
  });

  it('User can claim allocated lands from alternate address, but assetsHolder is Giveaway contract', async function () {
    const options = {
      mint: true,
      landHolder: true, // others[5]
    };
    const setUp = await setupTestGiveaway(options);
    const {
      giveawayContract,
      others,
      tree,
      claims,
      assetContract,
      landContract,
    } = setUp;

    const claim = claims[0];
    const proof = tree.getProof(calculateClaimableAssetAndLandHash(claim));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[1])
    );

    const initBalanceAssetId1 = await assetContract[
      'balanceOf(address,uint256)'
    ](giveawayContract.address, claim.assetIds[0]);
    expect(initBalanceAssetId1).to.equal(claim.assetValues[0]);
    const initBalanceAssetId2 = await assetContract[
      'balanceOf(address,uint256)'
    ](giveawayContract.address, claim.assetIds[1]);
    expect(initBalanceAssetId2).to.equal(claim.assetValues[1]);
    const initBalanceAssetId3 = await assetContract[
      'balanceOf(address,uint256)'
    ](giveawayContract.address, claim.assetIds[2]);
    expect(initBalanceAssetId3).to.equal(claim.assetValues[2]);

    const originalOwnerLandId1 = await landContract.ownerOf(0);
    expect(originalOwnerLandId1).to.equal(others[5]);
    const originalOwnerLandId2 = await landContract.ownerOf(1);
    expect(originalOwnerLandId2).to.equal(others[5]);
    const originalOwnerLandId3 = await landContract.ownerOf(2);
    expect(originalOwnerLandId3).to.equal(others[5]);
    const originalOwnerLandId4 = await landContract.ownerOf(3);
    expect(originalOwnerLandId4).to.equal(others[5]);
    const originalOwnerLandId5 = await landContract.ownerOf(4);
    expect(originalOwnerLandId5).to.equal(others[5]);

    await waitFor(
      giveawayContractAsUser.claimAssetsAndLands(
        others[1],
        claim.assetIds,
        claim.assetValues,
        claim.landIds,
        proof,
        claim.salt
      )
    );

    const balanceAssetId1 = await assetContract['balanceOf(address,uint256)'](
      others[1],
      claim.assetIds[0]
    );
    expect(balanceAssetId1).to.equal(claim.assetValues[0]);
    const balanceAssetId2 = await assetContract['balanceOf(address,uint256)'](
      others[1],
      claim.assetIds[1]
    );
    expect(balanceAssetId2).to.equal(claim.assetValues[1]);
    const balanceAssetId3 = await assetContract['balanceOf(address,uint256)'](
      others[1],
      claim.assetIds[2]
    );
    expect(balanceAssetId3).to.equal(claim.assetValues[2]);

    const ownerLandId1 = await landContract.ownerOf(0);
    expect(ownerLandId1).to.equal(claim.reservedAddress);
    const ownerLandId2 = await landContract.ownerOf(1);
    expect(ownerLandId2).to.equal(claim.reservedAddress);
    const ownerLandId3 = await landContract.ownerOf(2);
    expect(ownerLandId3).to.equal(claim.reservedAddress);
    const ownerLandId4 = await landContract.ownerOf(3);
    expect(ownerLandId4).to.equal(claim.reservedAddress);
    const ownerLandId5 = await landContract.ownerOf(4);
    expect(ownerLandId5).to.equal(claim.reservedAddress);
  });

  it('User can claim allocated assets and lands from alternate addresses', async function () {
    const options = {
      mint: true,
      assetsHolder: true, // others[5]
      landHolder: true, // others[5]
    };
    const setUp = await setupTestGiveaway(options);
    const {giveawayContract, others, tree, claims} = setUp;

    const claim = claims[0];
    const proof = tree.getProof(calculateClaimableAssetAndLandHash(claim));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[1])
    );

    await waitFor(
      giveawayContractAsUser.claimAssetsAndLands(
        others[1],
        claim.assetIds,
        claim.assetValues,
        claim.landIds,
        proof,
        claim.salt
      )
    );
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

  it('User cannot claim assets after the expiryTime', async function () {
    const options = {};
    const setUp = await setupTestGiveaway(options);
    const {giveawayContract, others, tree, claims} = setUp;

    const claim = claims[0];
    const proof = tree.getProof(calculateClaimableAssetAndLandHash(claim));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[1])
    );

    await increaseTime(60 * 60 * 24 * 30 * 4);

    await expect(
      giveawayContractAsUser.claimAssetsAndLands(
        others[1],
        claim.assetIds,
        claim.assetValues,
        claim.landIds,
        proof,
        claim.salt
      )
    ).to.be.revertedWith('CLAIM_PERIOD_IS_OVER');
  });
});
