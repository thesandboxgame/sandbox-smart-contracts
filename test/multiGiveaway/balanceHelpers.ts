/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import {expect} from '../chai-setup';

export const testInitialAssetAndLandBalances = async (
  claim: any,
  assetContract: any,
  landContract: any,
  giveawayContract: any
) => {
  const initBalanceAssetId1 = await assetContract['balanceOf(address,uint256)'](
    giveawayContract.address,
    claim.erc1155[0].ids[0]
  );
  expect(initBalanceAssetId1).to.equal(claim.erc1155[0].values[0]);
  const initBalanceAssetId2 = await assetContract['balanceOf(address,uint256)'](
    giveawayContract.address,
    claim.erc1155[0].ids[1]
  );
  expect(initBalanceAssetId2).to.equal(claim.erc1155[0].values[1]);
  const initBalanceAssetId3 = await assetContract['balanceOf(address,uint256)'](
    giveawayContract.address,
    claim.erc1155[0].ids[2]
  );
  expect(initBalanceAssetId3).to.equal(claim.erc1155[0].values[2]);

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
};

export const testInitialERC20Balance = async (
  user: any,
  erc20Contract: any
) => {
  const initialErc20Balance = await erc20Contract.balanceOf(user);
  expect(initialErc20Balance).to.equal(0);
};

export const testFinalAssetAndLandBalances = async (
  claim: any,
  user: any,
  assetContract: any,
  landContract: any
) => {
  const balanceAssetId1 = await assetContract['balanceOf(address,uint256)'](
    user,
    claim.erc1155[0].ids[0]
  );
  expect(balanceAssetId1).to.equal(claim.erc1155[0].values[0]);
  const balanceAssetId2 = await assetContract['balanceOf(address,uint256)'](
    user,
    claim.erc1155[0].ids[1]
  );
  expect(balanceAssetId2).to.equal(claim.erc1155[0].values[1]);
  const balanceAssetId3 = await assetContract['balanceOf(address,uint256)'](
    user,
    claim.erc1155[0].ids[2]
  );
  expect(balanceAssetId3).to.equal(claim.erc1155[0].values[2]);

  const ownerLandId1 = await landContract.ownerOf(0);
  expect(ownerLandId1).to.equal(claim.to);
  const ownerLandId2 = await landContract.ownerOf(1);
  expect(ownerLandId2).to.equal(claim.to);
  const ownerLandId3 = await landContract.ownerOf(2);
  expect(ownerLandId3).to.equal(claim.to);
  const ownerLandId4 = await landContract.ownerOf(3);
  expect(ownerLandId4).to.equal(claim.to);
  const ownerLandId5 = await landContract.ownerOf(4);
  expect(ownerLandId5).to.equal(claim.to);
  const ownerLandId6 = await landContract.ownerOf(5);
  expect(ownerLandId6).to.equal(claim.to);
};

export const testUpdatedERC20Balance = async (
  claim: any,
  user: any,
  erc20Contract: any,
  order: any
) => {
  const updatedErc20Balance = await erc20Contract.balanceOf(user);
  expect(updatedErc20Balance).to.equal(claim.erc20.amounts[order]);
};
