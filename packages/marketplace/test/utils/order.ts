// An order represents something offered (asset + who offers) plus what we want in exchange (asset + optionally for whom or everybody)
// SEE: LibOrder.sol and LibOrderData.sol
import {Asset, hashAsset, hashAssetType} from './assets';
import {bytes4Keccak} from './signature';
import {AbiCoder, Numeric, keccak256, Signer, ZeroAddress} from 'ethers';
import {BytesLike} from 'ethers/src.ts/utils/index';

export const ORDER_TYPEHASH = keccak256(
  Buffer.from(
    'Order(address maker,Asset makeAsset,address taker,Asset takeAsset,uint256 salt,uint256 start,uint256 end,bytes4 dataType,bytes data)Asset(AssetType assetType,uint256 value)AssetType(uint256 assetClass,bytes data)'
  )
);

const ORDER_DATA_BUY = bytes4Keccak('BUY');
const ORDER_DATA_SELL = bytes4Keccak('SELL');

export const DEFAULT_ORDER_TYPE = '0xffffffff';
export const UINT256_MAX_VALUE =
  115792089237316195423570985008687907853269984665640564039457584007913129639935n;

export type Order = {
  maker: string;
  makeAsset: Asset;
  taker: string;
  takeAsset: Asset;
  salt: Numeric;
  start: Numeric;
  end: Numeric;
  dataType: string;
  data: BytesLike;
};

export const OrderDefault = async (
  maker: Signer,
  makeAsset: Asset,
  taker: Signer | ZeroAddress,
  takeAsset: Asset,
  salt: Numeric,
  start: Numeric,
  end: Numeric
): Promise<Order> => ({
  maker: await maker.getAddress(),
  makeAsset,
  taker: taker === ZeroAddress ? ZeroAddress : await taker.getAddress(),
  takeAsset,
  salt,
  start,
  end,
  dataType: DEFAULT_ORDER_TYPE,
  data: '0x',
});

export const OrderSell = async (
  maker: Signer,
  makeAsset: Asset,
  taker: Signer | ZeroAddress,
  takeAsset: Asset,
  salt: Numeric,
  start: Numeric,
  end: Numeric,
  payouts: string, // TODO: better type
  originFeeFirst: string, // TODO: better type
  originFeeSecond: string, // TODO: better type
  maxFeesBasePoint: string, // TODO: better type
  marketplaceMarker: string // TODO: better type
): Promise<Order> => ({
  maker: await maker.getAddress(),
  makeAsset,
  taker: taker === ZeroAddress ? ZeroAddress : await taker.getAddress(),
  takeAsset,
  salt,
  start,
  end,
  dataType: ORDER_DATA_SELL,
  data: AbiCoder.defaultAbiCoder().encode(
    ['uint256', 'uint256', 'uint256', 'uint256', 'bytes32'],
    [
      payouts,
      originFeeFirst,
      originFeeSecond,
      maxFeesBasePoint,
      marketplaceMarker,
    ]
  ),
});

export const OrderBuy = async (
  maker: Signer,
  makeAsset: Asset,
  taker: Signer | ZeroAddress,
  takeAsset: Asset,
  salt: Numeric,
  start: Numeric,
  end: Numeric,
  payouts: string, // TODO: better type
  originFeeFirst: string, // TODO: better type
  originFeeSecond: string, // TODO: better type
  marketplaceMarker: string // TODO: better type
): Promise<Order> => ({
  maker: await maker.getAddress(),
  makeAsset,
  taker: taker === ZeroAddress ? ZeroAddress : await taker.getAddress(),
  takeAsset,
  salt,
  start,
  end,
  dataType: ORDER_DATA_BUY,
  data: AbiCoder.defaultAbiCoder().encode(
    ['uint256', 'uint256', 'uint256', 'bytes32'],
    [payouts, originFeeFirst, originFeeSecond, marketplaceMarker]
  ),
});

export function hashKey(order: Order): string {
  if (order.dataType === DEFAULT_ORDER_TYPE) {
    const encoded = AbiCoder.defaultAbiCoder().encode(
      ['address', 'bytes32', 'bytes32', 'uint256'],
      [
        order.maker,
        hashAssetType(order.makeAsset.assetType),
        hashAssetType(order.takeAsset.assetType),
        order.salt,
      ]
    );
    return keccak256(encoded);
  }
  // TODO: Review this on solidity side, instead of passing order.data maybe is better keccak(data)s
  const encoded = AbiCoder.defaultAbiCoder().encode(
    ['address', 'bytes32', 'bytes32', 'uint256', 'bytes'],
    [
      order.maker,
      hashAssetType(order.makeAsset.assetType),
      hashAssetType(order.takeAsset.assetType),
      order.salt,
      order.data,
    ]
  );
  return keccak256(encoded);
}

export const getSymmetricOrder = async (
  o: Order,
  taker?: Signer
): Promise<Order> => {
  const ret = {
    ...o,
    makeAsset: o.takeAsset,
    taker: o.maker,
    takeAsset: o.makeAsset,
  };
  if (taker) {
    return {...ret, maker: await taker.getAddress()};
  }
  if (o.taker === ZeroAddress) {
    throw new Error(
      'Original order was for anybody, the taker is needed to create the order'
    );
  }
  return {...ret, maker: o.taker};
};

// TODO: Test it.
export function hashOrder(order: Order): string {
  const encoded = AbiCoder.defaultAbiCoder().encode(
    [
      'bytes32',
      'address',
      'bytes32',
      'address',
      'bytes32',
      'uint256',
      'uint256',
      'uint256',
      'bytes4',
      'bytes32',
    ],
    [
      ORDER_TYPEHASH,
      order.maker,
      hashAsset(order.makeAsset),
      order.taker,
      hashAsset(order.takeAsset),
      order.salt,
      order.start,
      order.end,
      order.dataType,
      keccak256(order.data),
    ]
  );
  return keccak256(encoded);
}
