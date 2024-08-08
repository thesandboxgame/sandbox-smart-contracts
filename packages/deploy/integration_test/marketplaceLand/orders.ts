import {ethers} from 'hardhat';
import {BigNumber, BigNumberish, Contract} from 'ethers';

export const ASSET_TYPE_TYPEHASH = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes('AssetType(uint256 assetClass,bytes data)')
);

export function hashAssetType(a: AssetType) {
  if (a.assetClass === AssetClassType.INVALID_ASSET_CLASS) {
    throw new Error('Invalid assetClass' + a.assetClass);
  }
  return ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['bytes32', 'uint256', 'bytes32'],
      [ASSET_TYPE_TYPEHASH, a.assetClass, ethers.utils.keccak256(a.data)]
    )
  );
}

export function hashKey(order: Order): string {
  const encoded = ethers.utils.defaultAbiCoder.encode(
    ['address', 'bytes32', 'bytes32', 'uint256'],
    [
      order.maker,
      hashAssetType(order.makeAsset.assetType),
      hashAssetType(order.takeAsset.assetType),
      order.salt,
    ]
  );
  return ethers.utils.keccak256(encoded);
}

export async function signOrder(
  order: Order,
  account: string,
  verifyingContract: Contract
) {
  const network = await verifyingContract.provider.getNetwork();
  return await ethers.provider.send('eth_signTypedData_v4', [
    account,
    {
      types: {
        EIP712Domain: [
          {
            name: 'name',
            type: 'string',
          },
          {
            name: 'version',
            type: 'string',
          },
          {
            name: 'chainId',
            type: 'uint256',
          },
          {
            name: 'verifyingContract',
            type: 'address',
          },
        ],
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
      primaryType: 'Order',
      domain: {
        name: 'The Sandbox Marketplace',
        version: '1.0.0',
        chainId: network.chainId,
        verifyingContract: verifyingContract.address,
      },
      message: order,
    },
  ]);
}

export type Order = {
  maker: string;
  makeAsset: Asset;
  taker: string;
  takeAsset: Asset;
  salt: string;
  start: string;
  end: string;
};

export const OrderDefault = (
  maker: string,
  makeAsset: Asset,
  taker: string,
  takeAsset: Asset,
  salt: BigNumberish,
  start: BigNumberish,
  end: BigNumberish
): Order => ({
  maker: maker,
  makeAsset,
  taker: taker,
  takeAsset,
  salt: BigNumber.from(salt).toString(),
  start: BigNumber.from(start).toString(),
  end: BigNumber.from(end).toString(),
});

export enum AssetClassType {
  INVALID_ASSET_CLASS = '0x0',
  ERC20_ASSET_CLASS = '0x1',
  ERC721_ASSET_CLASS = '0x2',
  ERC1155_ASSET_CLASS = '0x3',
}

export type AssetType = {
  assetClass: AssetClassType;
  data: string;
};
export type Asset = {
  assetType: AssetType;
  value: string;
};
export const AssetERC20 = async (
  tokenContract: Contract,
  value: BigNumberish
): Promise<Asset> => ({
  assetType: {
    assetClass: AssetClassType.ERC20_ASSET_CLASS,
    data: ethers.utils.defaultAbiCoder.encode(
      ['address'],
      [tokenContract.address]
    ),
  },
  value: BigNumber.from(value).toString(),
});
export const AssetERC721 = async (
  tokenContract: Contract,
  tokenId: BigNumberish
): Promise<Asset> => ({
  assetType: {
    assetClass: AssetClassType.ERC721_ASSET_CLASS,
    data: ethers.utils.defaultAbiCoder.encode(
      ['address', 'uint256'],
      [tokenContract.address, BigNumber.from(tokenId)]
    ),
  },
  value: BigNumber.from(1).toString(),
});
