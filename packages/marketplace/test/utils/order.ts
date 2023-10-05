// An order represents something offered (asset + who offers) plus what we want in exchange (asset + optionally for whom or everybody)
// SEE: LibOrder.sol
import {Asset, hashAsset, hashAssetType} from './assets';
import {
  AbiCoder,
  Contract,
  keccak256,
  Numeric,
  Signer,
  ZeroAddress,
} from 'ethers';

export const ORDER_TYPEHASH = keccak256(
  Buffer.from(
    'Order(address maker,Asset makeAsset,address taker,Asset takeAsset,uint256 salt,uint256 start,uint256 end)Asset(AssetType assetType,uint256 value)AssetType(uint256 assetClass,bytes data)'
  )
);

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
});

export function hashKey(order: Order): string {
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
    ]
  );
  return keccak256(encoded);
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
        {name: 'assetClass', type: 'uint256'},
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
      ],
    },
    order
  );
}
