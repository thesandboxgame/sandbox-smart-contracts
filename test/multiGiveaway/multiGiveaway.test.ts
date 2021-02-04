import {ethers} from 'hardhat';
import {setupTestGiveawayWithERC20} from './fixtures';
import {constants} from 'ethers';
import {waitFor, expectReceiptEventWithArgs, increaseTime} from '../utils';
import {expect} from '../chai-setup';

import helpers from '../../lib/merkleTreeHelper';
const {calculateClaimableAssetLandAndSandHash} = helpers;

const zeroAddress = constants.AddressZero;

describe('Multi_Giveaway', function () {
  it('User cannot claim when test contract holds zero assets/lands', async function () {
    const options = {};
    const setUp = await setupTestGiveawayWithERC20(options);
    const {giveawayContract, others, tree, claims} = setUp;
    const claim = claims[0];
    const proof = tree.getProof(calculateClaimableAssetLandAndSandHash(claim));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[0])
    );

    await expect(
      giveawayContractAsUser.claimMultipleTokens(claim, proof)
    ).to.be.revertedWith(`can't substract more than there is`);
  });

  it('User cannot claim sand when contract does not hold any', async function () {
    const options = {
      mint: true,
    };
    const setUp = await setupTestGiveawayWithERC20(options);
    const {giveawayContract, others, tree, claims} = setUp;
    const claim = claims[0];
    const proof = tree.getProof(calculateClaimableAssetLandAndSandHash(claim));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[0])
    );

    await expect(
      giveawayContractAsUser.claimMultipleTokens(claim, proof)
    ).to.be.revertedWith(`not enough fund`);
  });

  it('User can claim allocated multiple assets for multiple assetIds together with lands and sand from Giveaway contract', async function () {
    const options = {
      mint: true,
      sand: true,
    };
    const setUp = await setupTestGiveawayWithERC20(options);
    const {
      giveawayContract,
      others,
      tree,
      claims,
      assetContract,
      landContract,
      sandContract,
    } = setUp;

    const claim = claims[0];

    const proof = tree.getProof(calculateClaimableAssetLandAndSandHash(claim));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[0])
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
    const originalOwnerLandId6 = await landContract.ownerOf(5);
    expect(originalOwnerLandId6).to.equal(giveawayContract.address);

    const initialSandBalance = await sandContract.balanceOf(others[0]);
    expect(initialSandBalance).to.equal(0);

    await waitFor(
      giveawayContractAsUser.claimMultipleTokens(
        others[0],
        claim.assetIds,
        claim.assetValues,
        claim.landIds,
        claim.sand,
        proof,
        claim.salt
      )
    );

    const updatedSandBalance = await sandContract.balanceOf(others[0]);
    expect(updatedSandBalance).to.equal(claim.sand);

    const balanceAssetId1 = await assetContract['balanceOf(address,uint256)'](
      others[0],
      claim.assetIds[0]
    );
    expect(balanceAssetId1).to.equal(claim.assetValues[0]);
    const balanceAssetId2 = await assetContract['balanceOf(address,uint256)'](
      others[0],
      claim.assetIds[1]
    );
    expect(balanceAssetId2).to.equal(claim.assetValues[1]);
    const balanceAssetId3 = await assetContract['balanceOf(address,uint256)'](
      others[0],
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
    const ownerLandId6 = await landContract.ownerOf(5);
    expect(ownerLandId6).to.equal(claim.reservedAddress);
  });

  it('Claimed Event is emitted for successful claim', async function () {
    const options = {
      mint: true,
      sand: true,
    };
    const setUp = await setupTestGiveawayWithERC20(options);
    const {giveawayContract, others, tree, claims} = setUp;

    const claim = claims[0];
    const proof = tree.getProof(calculateClaimableAssetLandAndSandHash(claim));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[0])
    );

    const receipt = await waitFor(
      giveawayContractAsUser.claimMultipleTokens(
        others[0],
        claim.assetIds,
        claim.assetValues,
        claim.landIds,
        claim.sand,
        proof,
        claim.salt
      )
    );

    const claimedEvent = await expectReceiptEventWithArgs(
      receipt,
      'ClaimedAssetsAndLandsWithERC20'
    );

    expect(claimedEvent.args[0]).to.equal(others[0]); // to
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
    expect(claimedEvent.args[3][5]).to.equal(claim.landIds[5]);
    expect(claimedEvent.args[4]).to.equal(claim.sand);
  });

  it('User can claim allocated sand from Giveaway contract when there are no assets or lands allocated', async function () {
    const options = {
      mint: true,
      sand: true,
    };
    const setUp = await setupTestGiveawayWithERC20(options);
    const {giveawayContract, others, tree, claims, sandContract} = setUp;

    const claim = claims[4];

    const proof = tree.getProof(calculateClaimableAssetLandAndSandHash(claim));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[0])
    );

    const initialSandBalance = await sandContract.balanceOf(others[0]);
    expect(initialSandBalance).to.equal(0);

    await waitFor(
      giveawayContractAsUser.claimMultipleTokens(
        others[0],
        [],
        [],
        [],
        claim.sand,
        proof,
        claim.salt
      )
    );

    const updatedSandBalance = await sandContract.balanceOf(others[0]);
    expect(updatedSandBalance).to.equal(claim.sand);
  });

  it('User cannot claim if they claim the wrong amount of sand', async function () {
    const options = {
      mint: true,
      sand: true,
    };
    const setUp = await setupTestGiveawayWithERC20(options);
    const {giveawayContract, others, tree, claims} = setUp;

    const claim = claims[0];
    const proof = tree.getProof(calculateClaimableAssetLandAndSandHash(claim));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[0])
    );

    await expect(
      giveawayContractAsUser.claimMultipleTokens(
        others[0],
        claim.assetIds,
        claim.assetValues,
        claim.landIds,
        250, // bad param
        proof,
        claim.salt
      )
    ).to.be.revertedWith('INVALID_CLAIM');
  });

  it('User cannot claim more than once', async function () {
    const options = {
      mint: true,
      sand: true,
    };
    const setUp = await setupTestGiveawayWithERC20(options);
    const {giveawayContract, others, tree, claims} = setUp;

    const claim = claims[0];
    const proof = tree.getProof(calculateClaimableAssetLandAndSandHash(claim));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[0])
    );

    await waitFor(
      giveawayContractAsUser.claimMultipleTokens(
        others[0],
        claim.assetIds,
        claim.assetValues,
        claim.landIds,
        claim.sand,
        proof,
        claim.salt
      )
    );
    await expect(
      giveawayContractAsUser.claimMultipleTokens(
        others[0],
        claim.assetIds,
        claim.assetValues,
        claim.landIds,
        claim.sand,
        proof,
        claim.salt
      )
    ).to.be.revertedWith('DESTINATION_ALREADY_CLAIMED');
  });

  it('User cannot claim assets from Giveaway contract if destination is not the reserved address', async function () {
    const options = {
      mint: true,
      sand: true,
    };
    const setUp = await setupTestGiveawayWithERC20(options);
    const {giveawayContract, others, tree, claims} = setUp;

    const claim = claims[0];
    const proof = tree.getProof(calculateClaimableAssetLandAndSandHash(claim));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[0])
    );

    await expect(
      giveawayContractAsUser.claimMultipleTokens(
        others[2], // bad param
        claim.assetIds,
        claim.assetValues,
        claim.landIds,
        claim.sand,
        proof,
        claim.salt
      )
    ).to.be.revertedWith('INVALID_CLAIM');
  });

  it('User cannot claim from Giveaway contract to destination zeroAddress', async function () {
    const options = {
      mint: true,
      sand: true,
    };
    const setUp = await setupTestGiveawayWithERC20(options);
    const {giveawayContract, others, tree, claims} = setUp;

    const claim = claims[0];
    const proof = tree.getProof(calculateClaimableAssetLandAndSandHash(claim));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[0])
    );

    await expect(
      giveawayContractAsUser.claimMultipleTokens(
        zeroAddress,
        claim.assetIds,
        claim.assetValues,
        claim.landIds,
        claim.sand,
        proof,
        claim.salt
      )
    ).to.be.revertedWith('INVALID_TO_ZERO_ADDRESS');
  });

  // it('User can claim allocated assets, lands and sand from 3 alternate addresses', async function () {
  //   const options = {
  //     mint: true,
  //     assetsHolder: true, // others[5]
  //     landHolder: true, // others[7]
  //     sandHolder: true, // others[6]
  //     sand: true,
  //   };
  //   const setUp = await setupTestGiveawayWithERC20(options);
  //   const {
  //     giveawayContract,
  //     others,
  //     tree,
  //     claims,
  //     assetContract,
  //     landContract,
  //     sandContract,
  //   } = setUp;

  //   const claim = claims[0];
  //   const proof = tree.getProof(calculateClaimableAssetLandAndSandHash(claim));
  //   const giveawayContractAsUser = await giveawayContract.connect(
  //     ethers.provider.getSigner(others[0])
  //   );

  //   const initBalanceAssetId1 = await assetContract[
  //     'balanceOf(address,uint256)'
  //   ](others[5], claim.assetIds[0]);
  //   expect(initBalanceAssetId1).to.equal(claim.assetValues[0]);
  //   const initBalanceAssetId2 = await assetContract[
  //     'balanceOf(address,uint256)'
  //   ](others[5], claim.assetIds[1]);
  //   expect(initBalanceAssetId2).to.equal(claim.assetValues[1]);
  //   const initBalanceAssetId3 = await assetContract[
  //     'balanceOf(address,uint256)'
  //   ](others[5], claim.assetIds[2]);
  //   expect(initBalanceAssetId3).to.equal(claim.assetValues[2]);

  //   const originalOwnerLandId1 = await landContract.ownerOf(0);
  //   expect(originalOwnerLandId1).to.equal(others[7]);
  //   const originalOwnerLandId2 = await landContract.ownerOf(1);
  //   expect(originalOwnerLandId2).to.equal(others[7]);
  //   const originalOwnerLandId3 = await landContract.ownerOf(2);
  //   expect(originalOwnerLandId3).to.equal(others[7]);
  //   const originalOwnerLandId4 = await landContract.ownerOf(3);
  //   expect(originalOwnerLandId4).to.equal(others[7]);
  //   const originalOwnerLandId5 = await landContract.ownerOf(4);
  //   expect(originalOwnerLandId5).to.equal(others[7]);
  //   const originalOwnerLandId6 = await landContract.ownerOf(5);
  //   expect(originalOwnerLandId6).to.equal(others[7]);

  //   const initialSandBalance = await sandContract.balanceOf(others[0]);
  //   expect(initialSandBalance).to.equal(0);

  //   await waitFor(
  //     giveawayContractAsUser.claimMultipleTokens(
  //       others[0],
  //       claim.assetIds,
  //       claim.assetValues,
  //       claim.landIds,
  //       claim.sand,
  //       proof,
  //       claim.salt
  //     )
  //   );

  //   const balanceAssetId1 = await assetContract['balanceOf(address,uint256)'](
  //     others[0],
  //     claim.assetIds[0]
  //   );
  //   expect(balanceAssetId1).to.equal(claim.assetValues[0]);
  //   const balanceAssetId2 = await assetContract['balanceOf(address,uint256)'](
  //     others[0],
  //     claim.assetIds[1]
  //   );
  //   expect(balanceAssetId2).to.equal(claim.assetValues[1]);
  //   const balanceAssetId3 = await assetContract['balanceOf(address,uint256)'](
  //     others[0],
  //     claim.assetIds[2]
  //   );
  //   expect(balanceAssetId3).to.equal(claim.assetValues[2]);

  //   const ownerLandId1 = await landContract.ownerOf(0);
  //   expect(ownerLandId1).to.equal(claim.reservedAddress);
  //   const ownerLandId2 = await landContract.ownerOf(1);
  //   expect(ownerLandId2).to.equal(claim.reservedAddress);
  //   const ownerLandId3 = await landContract.ownerOf(2);
  //   expect(ownerLandId3).to.equal(claim.reservedAddress);
  //   const ownerLandId4 = await landContract.ownerOf(3);
  //   expect(ownerLandId4).to.equal(claim.reservedAddress);
  //   const ownerLandId5 = await landContract.ownerOf(4);
  //   expect(ownerLandId5).to.equal(claim.reservedAddress);
  //   const ownerLandId6 = await landContract.ownerOf(5);
  //   expect(ownerLandId6).to.equal(claim.reservedAddress);

  //   const updatedSandBalance = await sandContract.balanceOf(others[0]);
  //   expect(updatedSandBalance).to.equal(claim.sand);
  // });

  it('merkleRoot can be set more than once, because the contract is reusable', async function () {
    const options = {};
    const setUp = await setupTestGiveawayWithERC20(options);
    const {giveawayContract, nftGiveawayAdmin} = setUp;

    const giveawayContractAsAdmin = await giveawayContract.connect(
      ethers.provider.getSigner(nftGiveawayAdmin)
    );

    await giveawayContractAsAdmin.setMerkleRoot(
      '0x0000000000000000000000000000000000000000000000000000000000000000'
    );
    await giveawayContractAsAdmin.setMerkleRoot(
      '0x0000000000000000000000000000000000000000000000000000000000000000'
    );
  });

  it('merkleRoot can only be set by admin', async function () {
    const options = {};
    const setUp = await setupTestGiveawayWithERC20(options);
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
    const setUp = await setupTestGiveawayWithERC20(options);
    const {giveawayContract, others, tree, claims} = setUp;

    const claim = claims[0];
    const proof = tree.getProof(calculateClaimableAssetLandAndSandHash(claim));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[0])
    );

    await increaseTime(60 * 60 * 24 * 30 * 4);

    await expect(
      giveawayContractAsUser.claimMultipleTokens(
        others[0],
        claim.assetIds,
        claim.assetValues,
        claim.landIds,
        claim.sand,
        proof,
        claim.salt
      )
    ).to.be.revertedWith('CLAIM_PERIOD_IS_OVER');
  });
});
