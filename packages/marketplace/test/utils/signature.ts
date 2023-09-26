import {Contract, keccak256, Signer} from 'ethers';
import {Order, OrderBack} from './order';

export type HashSignature = string;

export function bytes4Keccak(str: string): HashSignature {
  return keccak256(Buffer.from(str)).substring(0, 10);
}

export async function signOrder(
  order: Order,
  account: Signer,
  verifyingContract: Contract
) {
  const network = await verifyingContract.runner?.provider?.getNetwork();
  return account.signTypedData(
    {
      name: 'Exchange',
      version: '1',
      chainId: network.chainId,
      verifyingContract: await verifyingContract.getAddress(),
    },
    {
      AssetType: [
        {name: 'assetClass', type: 'bytes4'},
        {name: 'data', type: 'bytes'},
      ],
      Asset: [
        {name: 'assetType', type: 'AssetType'},
        {name: 'value', type: 'uint256'},
      ],
      Order: [
        {name: 'maker', type: 'address'},
        {name: 'makeAsset', type: 'Asset'},
        {name: 'taker', type: 'address'},
        {name: 'takeAsset', type: 'Asset'},
        {name: 'salt', type: 'uint256'},
        {name: 'start', type: 'uint256'},
        {name: 'end', type: 'uint256'},
        {name: 'dataType', type: 'bytes4'},
        {name: 'data', type: 'bytes'},
      ],
    },
    order
  );
}

export async function signOrderBack(
  order: OrderBack,
  account: Signer,
  verifyingContract: Contract
) {
  const network = await verifyingContract.runner?.provider?.getNetwork();
  return account.signTypedData(
    {
      name: 'Exchange',
      version: '1',
      chainId: network.chainId,
      verifyingContract: await verifyingContract.getAddress(),
    },
    {
      AssetType: [
        {name: 'assetClass', type: 'bytes4'},
        {name: 'data', type: 'bytes'},
      ],
      Asset: [
        {name: 'assetType', type: 'AssetType'},
        {name: 'value', type: 'uint256'},
      ],
      OrderBack: [
        {name: 'buyer', type: 'address'},
        {name: 'maker', type: 'address'},
        {name: 'makeAsset', type: 'Asset'},
        {name: 'taker', type: 'address'},
        {name: 'takeAsset', type: 'Asset'},
        {name: 'salt', type: 'uint256'},
        {name: 'start', type: 'uint256'},
        {name: 'end', type: 'uint256'},
        {name: 'dataType', type: 'bytes4'},
        {name: 'data', type: 'bytes'},
      ],
    },
    order
  );
}
