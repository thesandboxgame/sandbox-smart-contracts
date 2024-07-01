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
    'Order(address maker,Bundle makeAsset,address taker,Bundle takeAsset,address makeRecipient, uint256 salt,uint256 start,uint256 end)Bundle(Asset[] asset,uint256 amount)Asset(AssetType assetType,uint256 value)AssetType(uint256 assetClass,bytes data)'
  )
);

export const UINT256_MAX_VALUE =
  115792089237316195423570985008687907853269984665640564039457584007913129639935n;

export enum OrderType {
  V1,
  V2,
}

export type Signature = {
  signature: string
  version: OrderType
}

export type Bundle = {
  asset: Asset[];
  amount: Numeric;
};

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
  makeAsset: Bundle;
  taker: string;
  takeAsset: Bundle;
  makeRecipient: string;
  salt: Numeric;
  start: Numeric;
  end: Numeric;
};

export const OrderDefault = async (
  maker: {getAddress: () => Promise<string>},
  makeAsset: Bundle,
  taker: Signer | ZeroAddress,
  takeAsset: Bundle,
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

export function hashKey(order: Order, version: OrderType) {
  if (version === OrderType.V1) {
      return keccak256(AbiCoder.defaultAbiCoder().encode(
          ['address', 'address', 'bytes32', 'bytes32', 'uint256'],
          [
              order.maker,
              order.makeRecipient,
              hashAsset(order.makeAsset.asset[0]), // Assuming this hashes only the assetType part
              hashAsset(order.takeAsset.asset[0]), // Same as above
              order.salt
          ]
      ));
  } else { // Assuming version 'V2'
      const makeAssetsEncoded = encodeAssets(order.makeAsset.asset);
      const takeAssetsEncoded = encodeAssets(order.takeAsset.asset);
      return keccak256(AbiCoder.defaultAbiCoder().encode(
          ['address', 'address', 'bytes32', 'bytes32', 'uint256'],
          [
              order.maker,
              order.makeRecipient,
              keccak256(makeAssetsEncoded), // Hash of all makeAssets
              keccak256(takeAssetsEncoded), // Hash of all takeAssets
              order.salt
          ]
      ));
  }
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



function encodeAssets(assets: Asset[]) {
  // This mirrors the Solidity abi.encodePacked by concatenating hashes directly
  let encodedAssets = '0x';
  for (let asset of assets) {
      // Assuming hashAsset returns a '0x' prefixed string
      encodedAssets += hashAsset(asset).slice(2); // Remove '0x' from start of each hash
  }
  return encodedAssets;
}

function hashBundle(bundle: Bundle) {
  // This needs to match Solidity's use of abi.encodePacked for assets and amount
  // Since ethers.js doesn't have abi.encodePacked, we manually concatenate
  const encodedAssets = encodeAssets(bundle.asset);
  const encodedAmount = AbiCoder.defaultAbiCoder().encode(['uint256'], [bundle.amount]);
  return keccak256(encodedAssets + encodedAmount.slice(2)); // Remove '0x' from encoded amount
}

export function hashOrder(order: Order, version: OrderType) {
  if (version === OrderType.V1) {
      return keccak256(AbiCoder.defaultAbiCoder().encode(
          ['bytes32', 'address', 'bytes32', 'address', 'bytes32', 'address', 'uint256', 'uint256', 'uint256'],
          [
              ORDER_TYPEHASH_V1,
              order.maker,
              hashAsset(order.makeAsset.asset[0]), // Assuming this is correct for V1
              order.taker,
              hashAsset(order.takeAsset.asset[0]), // Same as above for V1
              order.makeRecipient,
              order.salt.toString(),
              order.start.toString(),
              order.end.toString()
          ]
      ));
  } else { // V2
      return keccak256(AbiCoder.defaultAbiCoder().encode(
          ['bytes32', 'address', 'bytes32', 'address', 'bytes32', 'address', 'uint256', 'uint256', 'uint256'],
          [
              ORDER_TYPEHASH_V2,
              order.maker,
              hashBundle(order.makeAsset), // Ensure this matches Solidity's V2 logic
              order.taker,
              hashBundle(order.takeAsset), // Same as above for V2
              order.makeRecipient,
              order.salt.toString(),
              order.start.toString(),
              order.end.toString()
          ]
      ));
  }
}

// ToDo: fix that -> not working with bundle structs
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

  // Determine if the order is V1 or not based on the structure of makeAsset and takeAsset
  // This assumes that V1 orders have makeAsset and takeAsset as non-array types
  const isOrderV1 = !(order.makeAsset && 'asset' in order.makeAsset && Array.isArray(order.makeAsset.asset));

  // Define EIP-712 types dynamically based on the order structure
  const types = {
    AssetType: [
      { name: 'assetClass', type: 'uint256' },
      { name: 'data', type: 'bytes' },
    ],
    Asset: [
      { name: 'assetType', type: 'AssetType' },
      { name: 'value', type: 'uint256' },
    ],
    ...(isOrderV1 ? {} : { // Only add Bundle type if needed (for V2 orders)
      Bundle: [
        { name: 'asset', type: 'Asset[]' },
        { name: 'amount', type: 'uint256' },
      ]
    }),
    Order: [
      { name: 'maker', type: 'address' },
      { name: 'makeAsset', type: isOrderV1 ? 'Asset' : 'Bundle' },
      { name: 'taker', type: 'address' },
      { name: 'takeAsset', type: isOrderV1 ? 'Asset' : 'Bundle' },
      { name: 'makeRecipient', type: 'address' },
      { name: 'salt', type: 'uint256' },
      { name: 'start', type: 'uint256' },
      { name: 'end', type: 'uint256' },
    ],
  };

  // Adjust the order data structure for EIP-712 signing
  const orderData = {
    ...order,
    makeAsset: isOrderV1
      ? { ...order.makeAsset }
      : {
          asset: order.makeAsset.asset.map(asset => ({
            assetType: { ...asset.assetType },
            value: asset.value,
          })),
          amount: order.makeAsset.amount,
        },
    takeAsset: isOrderV1
      ? { ...order.takeAsset }
      : {
          asset: order.takeAsset.asset.map(asset => ({
            assetType: { ...asset.assetType },
            value: asset.value,
          })),
          amount: order.takeAsset.amount,
        },
  };

  return account.signTypedData(domain, types, orderData);
}

// export async function signOrder(
//   order: OrderV1 | Order,
//   account: Signer,
//   verifyingContract: Contract
// ) {
//   const network = await verifyingContract.runner?.provider?.getNetwork();
//   const domain = {
//     name: 'The Sandbox Marketplace',
//     version: '1.0.0',
//     chainId: network.chainId,
//     verifyingContract: await verifyingContract.getAddress(),
//   };

//   // Determine if the order is V1 or not based on the makeAsset and takeAsset
//   const isOrderV1 = !Array.isArray(order.makeAsset);

//   // Define EIP-712 types dynamically based on the order structure
//   const types = {
//     AssetType: [
//       {name: 'assetClass', type: 'uint256'},
//       {name: 'data', type: 'bytes'},
//     ],
//     Asset: [
//       {name: 'assetType', type: 'AssetType'},
//       {name: 'value', type: 'uint256'},
//     ],
//     Order: [
//       {name: 'maker', type: 'address'},
//       {name: 'makeAsset', type: isOrderV1 ? 'Asset' : 'Bundle'},
//       {name: 'taker', type: 'address'},
//       {name: 'takeAsset', type: isOrderV1 ? 'Asset' : 'Bundle'},
//       {name: 'makeRecipient', type: 'address'},
//       {name: 'salt', type: 'uint256'},
//       {name: 'start', type: 'uint256'},
//       {name: 'end', type: 'uint256'},
//     ],
//   };

//   // Adjust the order data structure for EIP-712 signing
//   const orderData = {
//     ...order,
//     makeAsset: isOrderV1
//       ? order.makeAsset
//       : order.makeAsset.map((asset) => ({
//           assetType: {...asset.assetType},
//           value: asset.value,
//         })),
//     takeAsset: isOrderV1
//       ? order.takeAsset
//       : order.takeAsset.map((asset) => ({
//           assetType: {...asset.assetType},
//           value: asset.value,
//         })),
//   };

//   return account.signTypedData(domain, types, orderData);
// }

export function isAssetTypeEqual(x: AssetType, y: AssetType): boolean {
  return x.assetClass == y.assetClass && x.data == y.data;
}

export function isAssetEqual(x: Asset, y: Asset): boolean {
  return isAssetTypeEqual(x.assetType, y.assetType) && x.value == y.value;
}

// ToDo: Check this function for bundles
export function isOrderEqual(x: Order, order: Order): boolean {
  return (
    x.maker === order.maker &&
    isAssetEqual(x.makeAsset.asset[0], order.makeAsset.asset[0]) &&
    x.taker === order.taker &&
    isAssetEqual(x.takeAsset.asset[0], order.takeAsset.asset[0]) &&
    x.salt == order.salt &&
    x.start == order.start &&
    x.end == order.end
  );
}
