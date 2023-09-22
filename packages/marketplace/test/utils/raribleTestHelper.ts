// This replaces the calls to the RaribleTestHelper.sol
import {AbiCoder} from 'ethers';

export type SellData = {
  payouts: string; // TODO: better type
  originFeeFirst: string; // TODO: better type
  originFeeSecond: string; // TODO: better type
  maxFeesBasePoint: string; // TODO: better type
  marketplaceMarker: string; // TODO: better type
};

export function encode_SELL(data: SellData): string {
  return AbiCoder.defaultAbiCoder().encode(
    ['uint256', 'uint256', 'uint256', 'uint256', 'bytes32'],
    [
      data.payouts,
      data.originFeeFirst,
      data.originFeeSecond,
      data.maxFeesBasePoint,
      data.marketplaceMarker,
    ]
  );
}

export type BuyData = {
  payouts: string; // TODO: better type
  originFeeFirst: string; // TODO: better type
  originFeeSecond: string; // TODO: better type
  marketplaceMarker: string; // TODO: better type
};

export function encode_BUY(data: BuyData): string {
  return AbiCoder.defaultAbiCoder().encode(
    ['uint256', 'uint256', 'uint256', 'bytes32'],
    [
      data.payouts,
      data.originFeeFirst,
      data.originFeeSecond,
      data.marketplaceMarker,
    ]
  );
}

export function encodeOriginFeeIntoUint(
  account: string,
  value: string
): bigint {
  return BigInt(account) << (160 + BigInt(value));
}

// TODO: Implement
// function hashV2(
