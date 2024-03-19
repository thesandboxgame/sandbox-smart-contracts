// An order represents something offered (asset + who offers) plus what we want in exchange (asset + optionally for whom or everybody)
// SEE: LibOrder.sol
import {Asset, AssetType, hashAsset, hashAssetType} from './assets';
import {
  AbiCoder,
  Contract,
  keccak256,
  Numeric,
  Signer,
  ZeroAddress,
} from 'ethers';

export const ORDER_TYPEHASH_V1 = keccak256(
  Buffer.from(
    'Order(address maker,Asset makeAsset,address taker,Asset takeAsset,address makeRecipient,uint256 salt,uint256 start,uint256 end)Asset(AssetType assetType,uint256 value)AssetType(uint256 assetClass,bytes data)'
  )
);

export const ORDER_TYPEHASH_V2 = keccak256(
  Buffer.from(
    'Order(address maker,Asset[] makeAsset,address taker,Asset[] takeAsset,uint256 salt,uint256 start,uint256 end)Asset(AssetType assetType,uint256 value)AssetType(uint256 assetClass,bytes data)'
  )
);

export enum OrderType {
  V1,
  V2,
}

export const UINT256_MAX_VALUE =
  115792089237316195423570985008687907853269984665640564039457584007913129639935n;

export type OrderV1 = {
  maker: string;
  makeAsset: Asset;
  taker: string;
  takeAsset: Asset;
  makeRecipient: string;
  salt: Numeric;
  start: Numeric;
  end: Numeric;
};

export type Order = {
  maker: string;
  makeAsset: Asset[];
  taker: string;
  takeAsset: Asset[];
  makeRecipient: string;
  salt: Numeric;
  start: Numeric;
  end: Numeric;
};

export const OrderDefault = async (
  maker: {getAddress: () => Promise<string>},
  makeAsset: Asset[],
  taker: Signer | ZeroAddress,
  takeAsset: Asset[],
  salt: Numeric,
  start: Numeric,
  end: Numeric,
  makeRecipient?: Address
): Promise<Order> => ({
  maker: await maker.getAddress(),
  makeAsset,
  taker:
    taker === ZeroAddress ? ZeroAddress : await (taker as Signer).getAddress(),
  takeAsset,
  makeRecipient: makeRecipient || (await maker.getAddress()), // Use makerAddress if makeRecipient is not provided
  salt,
  start,
  end,
});

export function hashKey(order: Order): string {
  // ToDo: make compatible with V1 and V2.
  const encoded = AbiCoder.defaultAbiCoder().encode(
    ['address', 'address', 'bytes32', 'bytes32', 'uint256'],
    [
      order.maker,
      hashAssetType(order.makeAsset[0].assetType),
      hashAssetType(order.takeAsset[0].assetType),
      order.makeRecipient,
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
    return {
      ...ret,
      maker: await taker.getAddress(),
      makeRecipient: await taker.getAddress(),
    };
  }
  if (o.taker === ZeroAddress) {
    throw new Error(
      'Original order was for anybody, the taker is needed to create the order'
    );
  }
  return {...ret, maker: o.taker};
};

export function hashOrder(order: Order, orderType: any): string {
  if (orderType === OrderType.V1) {
    const encoded = AbiCoder.defaultAbiCoder().encode(
      [
        'bytes32',
        'address',
        'bytes32',
        'address',
        'bytes32',
        'address',
        'uint256',
        'uint256',
        'uint256',
      ],
      [
        ORDER_TYPEHASH_V1,
        order.maker,
        hashAsset(order.makeAsset[0]),
        order.taker,
        hashAsset(order.takeAsset[0]),
        order.makeRecipient,
        order.salt,
        order.start,
        order.end,
      ]
    );
    return keccak256(encoded);
  } else {
    // Helper function to concatenate hashes of asset arrays
    function concatenateAssetHashes(assets: any) {
      return assets.reduce(
        (acc: any, asset: any) => acc + hashAsset(asset).slice(2),
        '0x'
      );
    }

    // Hash and concatenate all makeAssets and takeAssets
    const makeAssetsEncoded = concatenateAssetHashes(order.makeAsset);
    const takeAssetsEncoded = concatenateAssetHashes(order.takeAsset);

    const encoded = AbiCoder.defaultAbiCoder().encode(
      [
        'bytes32',
        'address',
        'bytes32',
        'address',
        'bytes32',
        'address',
        'uint256',
        'uint256',
        'uint256',
      ],
      [
        ORDER_TYPEHASH_V2,
        order.maker,
        keccak256(makeAssetsEncoded),
        order.taker,
        keccak256(takeAssetsEncoded),
        order.makeRecipient,
        order.salt,
        order.start,
        order.end,
      ]
    );
    return keccak256(encoded);
  }
}

export async function signOrder(
  order: OrderV1 | Order,
  account: Signer,
  verifyingContract: Contract
) {
  const network = await verifyingContract.runner?.provider?.getNetwork();
  const domain = {
    name: 'The Sandbox Marketplace',
    version: '1.0.0',
    chainId: network.chainId,
    verifyingContract: await verifyingContract.getAddress(),
  };

  // Determine if the order is V1 or not based on the makeAsset and takeAsset
  const isOrderV1 = !Array.isArray(order.makeAsset);

  // Define EIP-712 types dynamically based on the order structure
  const types = {
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
      {name: 'makeAsset', type: isOrderV1 ? 'Asset' : 'Asset[]'},
      {name: 'taker', type: 'address'},
      {name: 'takeAsset', type: isOrderV1 ? 'Asset' : 'Asset[]'},
      {name: 'makeRecipient', type: 'address'},
      {name: 'salt', type: 'uint256'},
      {name: 'start', type: 'uint256'},
      {name: 'end', type: 'uint256'},
    ],
  };

  // Adjust the order data structure for EIP-712 signing
  const orderData = {
    ...order,
    makeAsset: isOrderV1
      ? order.makeAsset
      : order.makeAsset.map((asset) => ({
          assetType: {...asset.assetType},
          value: asset.value,
        })),
    takeAsset: isOrderV1
      ? order.takeAsset
      : order.takeAsset.map((asset) => ({
          assetType: {...asset.assetType},
          value: asset.value,
        })),
  };

  return account.signTypedData(domain, types, orderData);
}

export function isAssetTypeEqual(x: AssetType, y: AssetType): boolean {
  return x.assetClass == y.assetClass && x.data == y.data;
}

export function isAssetEqual(x: Asset, y: Asset): boolean {
  return isAssetTypeEqual(x.assetType, y.assetType) && x.value == y.value;
}

export function isOrderEqual(x: Order, order: Order): boolean {
  return (
    x.maker === order.maker &&
    isAssetEqual(x.makeAsset[0], order.makeAsset[0]) &&
    x.taker === order.taker &&
    isAssetEqual(x.takeAsset[0], order.takeAsset[0]) &&
    x.salt == order.salt &&
    x.start == order.start &&
    x.end == order.end
  );
}
