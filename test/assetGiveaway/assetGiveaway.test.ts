import {ethers} from 'hardhat';
import {setupGiveaway} from './fixtures';
import {constants} from 'ethers';
import {waitFor, expectReceiptEventWithArgs} from '../utils';
import {expect} from '../chai-setup';

import helpers from '../../lib/merkleTreeHelper';
const {calculateAssetHash} = helpers;

const zeroAddress = constants.AddressZero;

describe('NFT_Lottery_1', function () {
  it('User cannot claim when contract holds zero assets', async function () {
    const setUp = await setupGiveaway('test');
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
        [
          '20753672845763602908712305506126331087417629839765087575719790731796278151168',
          '20753672845763602908712305506126331087417629839765087575719790731796286539776',
          '20753672845763602908712305506126331087417629839765087575719790731796294928384',
        ],
        [5, 5, 5],
        proof,
        asset.salt
      )
    ).to.be.revertedWith(`can't substract more than there is`);
  });

  it('User can claim allocated multiple assets for multiple asssetIds from Giveaway contract', async function () {
    const setUp = await setupGiveaway('test', true, 3, 5, 'contract');
    const {giveawayContract, others, tree, assets, assetContract} = setUp;

    const asset = assets[0];
    const proof = tree.getProof(calculateAssetHash(asset));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[1])
    );

    await waitFor(
      giveawayContractAsUser.claimAssets(
        others[1],
        others[1],
        [
          '20753672845763602908712305506126331087417629839765087575719790731796278151168',
          '20753672845763602908712305506126331087417629839765087575719790731796286539776',
          '20753672845763602908712305506126331087417629839765087575719790731796294928384',
        ],
        [5, 5, 5],
        proof,
        asset.salt
      )
    );

    const balanceAssetId1 = await assetContract['balanceOf(address,uint256)'](
      others[1],
      '20753672845763602908712305506126331087417629839765087575719790731796278151168'
    );
    expect(balanceAssetId1).to.equal(5);
    const balanceAssetId2 = await assetContract['balanceOf(address,uint256)'](
      others[1],
      '20753672845763602908712305506126331087417629839765087575719790731796286539776'
    );
    expect(balanceAssetId2).to.equal(5);
    const balanceAssetId3 = await assetContract['balanceOf(address,uint256)'](
      others[1],
      '20753672845763602908712305506126331087417629839765087575719790731796294928384'
    );
    expect(balanceAssetId3).to.equal(5);
  });

  it('Claimed Event is emitted for successful claim', async function () {
    const setUp = await setupGiveaway('test', true, 3, 5, 'contract');
    const {giveawayContract, others, tree, assets} = setUp;

    const asset = assets[0];
    const proof = tree.getProof(calculateAssetHash(asset));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[1])
    );

    const receipt = await waitFor(
      giveawayContractAsUser.claimAssets(
        others[1],
        others[1],
        [
          '20753672845763602908712305506126331087417629839765087575719790731796278151168',
          '20753672845763602908712305506126331087417629839765087575719790731796286539776',
          '20753672845763602908712305506126331087417629839765087575719790731796294928384',
        ],
        [5, 5, 5],
        proof,
        asset.salt
      )
    );

    const claimedEvent = await expectReceiptEventWithArgs(
      receipt,
      'ClaimedAssets'
    );

    expect(claimedEvent.args[0]).to.equal(others[1]); // to
    expect(claimedEvent.args[1][0]).to.equal(
      '20753672845763602908712305506126331087417629839765087575719790731796278151168'
    );
    expect(claimedEvent.args[1][1]).to.equal(
      '20753672845763602908712305506126331087417629839765087575719790731796286539776'
    );
    expect(claimedEvent.args[1][2]).to.equal(
      '20753672845763602908712305506126331087417629839765087575719790731796294928384'
    );
    expect(claimedEvent.args[2][0]).to.equal(5);
    expect(claimedEvent.args[2][1]).to.equal(5);
    expect(claimedEvent.args[2][2]).to.equal(5);
  });

  it('User can claim allocated single asset for single assetId from Giveaway contract', async function () {
    const setUp = await setupGiveaway('test', true, 1, 1, 'contract');
    const {giveawayContract, others, tree, assets} = setUp;

    const asset = assets[1];
    const proof = tree.getProof(calculateAssetHash(asset));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[1])
    );

    await waitFor(
      giveawayContractAsUser.claimAssets(
        others[1],
        others[1],
        [
          '20753672845763602908712305506126331087417629839804701656976922900593050124288',
        ],
        [1],
        proof,
        asset.salt
      )
    );
  });

  it('User tries to claim the wrong amount of an assetID', async function () {
    const setUp = await setupGiveaway('test', true, 1, 0, 'contract');
    const {giveawayContract, others, tree, assets} = setUp;

    const asset = assets[1];
    const proof = tree.getProof(calculateAssetHash(asset));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[1])
    );

    await expect(
      giveawayContractAsUser.claimAssets(
        others[1],
        others[1],
        [
          '20753672845763602908712305506126331087417629839765087575719790731796278151168',
        ],
        [0], // bad param
        proof,
        asset.salt
      )
    ).to.be.revertedWith('INVALID_CLAIM');
  });

  it('User cannot claim their assets more than once', async function () {
    const setUp = await setupGiveaway('test', true, 3, 5, 'contract');
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
        [
          '20753672845763602908712305506126331087417629839765087575719790731796278151168',
          '20753672845763602908712305506126331087417629839765087575719790731796286539776',
          '20753672845763602908712305506126331087417629839765087575719790731796294928384',
        ],
        [5, 5, 5],
        proof,
        asset.salt
      )
    );
    await expect(
      giveawayContractAsUser.claimAssets(
        others[1],
        others[1],
        [
          '20753672845763602908712305506126331087417629839765087575719790731796278151168',
          '20753672845763602908712305506126331087417629839765087575719790731796286539776',
          '20753672845763602908712305506126331087417629839765087575719790731796294928384',
        ],
        [5, 5, 5],
        proof,
        asset.salt
      )
    ).to.be.revertedWith('DESTINATION_ALREADY_CLAIMED');
  });

  it('User cannot claim assets from Giveaway contract if destination is not the reserved address', async function () {
    const setUp = await setupGiveaway('test', true, 3, 5, 'contract');
    const {giveawayContract, others, tree, assets} = setUp;

    const asset = assets[0];
    const proof = tree.getProof(calculateAssetHash(asset));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[1])
    );

    await expect(
      giveawayContractAsUser.claimAssets(
        others[1],
        others[2], // bad param
        [
          '20753672845763602908712305506126331087417629839765087575719790731796278151168',
          '20753672845763602908712305506126331087417629839765087575719790731796286539776',
          '20753672845763602908712305506126331087417629839765087575719790731796294928384',
        ],
        [5, 5, 5],
        proof,
        asset.salt
      )
    ).to.be.revertedWith('INVALID_CLAIM');
  });

  it('User cannot claim assets from Giveaway contract to destination zeroAddress', async function () {
    const setUp = await setupGiveaway('test', true, 3, 5, 'contract');
    const {giveawayContract, others, tree, assets} = setUp;

    const asset = assets[0];
    const proof = tree.getProof(calculateAssetHash(asset));
    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[1])
    );

    await expect(
      giveawayContractAsUser.claimAssets(
        others[1],
        zeroAddress,
        [
          '20753672845763602908712305506126331087417629839765087575719790731796278151168',
          '20753672845763602908712305506126331087417629839765087575719790731796286539776',
          '20753672845763602908712305506126331087417629839765087575719790731796294928384',
        ],
        [5, 5, 5],
        proof,
        asset.salt
      )
    ).to.be.revertedWith('INVALID_TO_ZERO_ADDRESS');
  });
  it('User cannot claim assets from Giveaway contract with incorrect asset param', async function () {
    const setUp = await setupGiveaway('test', true, 3, 5, 'contract');
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
        [
          '20753672845763602908712305506126331087417629839765087575719790731796278151168',
          '20753672845763602908712305506126331087417629839765087575719790731796286539776',
          '20753672845763602908712305506126331087417629839765087575719790731796294928384',
        ],
        [5, 5], // length too short
        proof,
        asset.salt
      )
    ).to.be.revertedWith('INVALID_INPUT');
  });

  it('Invalid MetaTx sender cannot claim on behalf of a reservedAddress', async function () {
    const setUp = await setupGiveaway('test', true, 3, 5, 'contract');
    const {giveawayContract, others, tree, assets, sandAdmin} = setUp;

    const asset = assets[0];
    const proof = tree.getProof(calculateAssetHash(asset));
    const giveawayContractAsAdmin = await giveawayContract.connect(
      ethers.provider.getSigner(sandAdmin)
    );

    await expect(
      giveawayContractAsAdmin.claimAssets(
        others[1],
        others[1],
        [
          '20753672845763602908712305506126331087417629839765087575719790731796278151168',
          '20753672845763602908712305506126331087417629839765087575719790731796286539776',
          '20753672845763602908712305506126331087417629839765087575719790731796294928384',
        ],
        [5, 5, 5],
        proof,
        asset.salt
      )
    ).to.be.revertedWith('INVALID SENDER');
  });

  // TODO?
  // valid metatx sender
  // [assets can be claimed from a different address]
});
