import {expect} from '../chai-setup';
import {Contract} from 'ethers';

type Claim = {
  to: string;
  erc1155: ERC1155Claim[];
  erc721: ERC721Claim[];
  erc20: ERC20Claim;
  salt?: string;
};

type ERC1155Claim = {ids: number[]; values: number[]; contractAddress: string};
type ERC721Claim = {ids: number[]; contractAddress: string};
type ERC20Claim = {amounts: number[]; contractAddresses: string[]};

export const testInitialAssetAndLandBalances = async (
  claim: Claim,
  assetContract: Contract,
  landContract: Contract,
  giveawayContract: Contract
): Promise<void> => {
  for (let i = 0; i < 3; i++) {
    const initBalanceAssetId = await assetContract[
      'balanceOf(address,uint256)'
    ](giveawayContract.address, claim.erc1155[0].ids[i]);
    expect(initBalanceAssetId).to.equal(claim.erc1155[0].values[i]);
  }

  for (let i = 0; i < 6; i++) {
    const originalOwnerLandId = await landContract.ownerOf(i);
    expect(originalOwnerLandId).to.equal(giveawayContract.address);
  }
};

export const testInitialERC20Balance = async (
  user: string,
  erc20Contract: Contract
): Promise<void> => {
  const initialErc20Balance = await erc20Contract.balanceOf(user);
  expect(initialErc20Balance).to.equal(0);
};

export const testFinalAssetAndLandBalances = async (
  claim: Claim,
  user: string,
  assetContract: Contract,
  landContract: Contract
): Promise<void> => {
  for (let i = 0; i < 3; i++) {
    const balanceAssetId = await assetContract['balanceOf(address,uint256)'](
      user,
      claim.erc1155[0].ids[i]
    );
    expect(balanceAssetId).to.equal(claim.erc1155[0].values[i]);
  }
  for (let i = 0; i < 6; i++) {
    const ownerLandId = await landContract.ownerOf(i);
    expect(ownerLandId).to.equal(claim.to);
  }
};

export const testUpdatedERC20Balance = async (
  claim: Claim,
  user: string,
  erc20Contract: Contract,
  order: number
): Promise<void> => {
  const updatedErc20Balance = await erc20Contract.balanceOf(user);
  expect(updatedErc20Balance).to.equal(claim.erc20.amounts[order]);
};
