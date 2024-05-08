// AssetXXX represents something you want to trade, for example:
// "20 eth" == AssetETH(20), "11 Sand" == AssetERC20(SandTokenAddress, 11)
// some NFT" == AssetERC721(nftContractAddress, tokenId), etc
// SEE: LibAsset.sol
import {
  AbiCoder,
  AddressLike,
  BytesLike,
  Contract,
  keccak256,
  Numeric,
} from 'ethers';

export enum AssetClassType {
  INVALID_ASSET_CLASS = '0x0',
  ERC20_ASSET_CLASS = '0x1',
  ERC721_ASSET_CLASS = '0x2',
  ERC1155_ASSET_CLASS = '0x3',
  BUNDLE_ASSET_CLASS = '0x4',
}

export const ASSET_TYPE_TYPEHASH = keccak256(
  Buffer.from('AssetType(uint256 assetClass,bytes data)')
);
export const ASSET_TYPEHASH = keccak256(
  Buffer.from(
    'Asset(AssetType assetType,uint256 value)AssetType(uint256 assetClass,bytes data)'
  )
);

export type LibPart = {
  account: AddressLike;
  value: Numeric;
};

export type FeeRecipients = {
  recipient: AddressLike;
  bps: Numeric;
};

export type AssetType = {
  assetClass: AssetClassType;
  data: BytesLike;
};

export type Asset = {
  assetType: AssetType;
  value: Numeric;
};

export const FeeRecipientsData = async (
  recipient: AddressLike,
  bps: Numeric
): Promise<FeeRecipients> => ({
  recipient,
  bps,
});

export const LibPartData = async (
  account: AddressLike,
  basisPoints: Numeric
): Promise<LibPart> => ({
  account,
  basisPoints,
});

export const AssetERC20 = async (
  tokenContract: Contract,
  value: Numeric,
  recipient?: string
): Promise<Asset> => {
  const baseParams: string[] = ['address'];
  const baseValues: (string | number)[] = [await tokenContract.getAddress()];

  if (recipient) {
    baseParams.push('uint256');
    baseValues.push(0);
    baseParams.push('address');
    baseValues.push(recipient);
  }

  console.log(baseParams);
  console.log(baseValues);

  return {
    assetType: {
      assetClass: AssetClassType.ERC20_ASSET_CLASS,
      data: AbiCoder.defaultAbiCoder().encode(baseParams, baseValues),
    },
    value,
  };
};

export const AssetERC721 = async (
  tokenContract: Contract,
  tokenId: Numeric,
  recipient?: string
): Promise<Asset> => {
  const baseParams = ['address', 'uint256'];
  const baseValues = [await tokenContract.getAddress(), tokenId];

  if (recipient) {
    baseParams.push('address');
    baseValues.push(recipient);
  }

  return {
    assetType: {
      assetClass: AssetClassType.ERC721_ASSET_CLASS,
      data: AbiCoder.defaultAbiCoder().encode(baseParams, baseValues),
    },
    value: 1,
  };
};

export const AssetERC1155 = async (
  tokenContract: Contract,
  tokenId: Numeric,
  value: Numeric,
  recipient?: string
): Promise<Asset> => {
  const baseParams = ['address', 'uint256'];
  const baseValues = [await tokenContract.getAddress(), tokenId];

  if (recipient) {
    baseParams.push('address');
    baseValues.push(recipient);
  }

  return {
    assetType: {
      assetClass: AssetClassType.ERC1155_ASSET_CLASS,
      data: AbiCoder.defaultAbiCoder().encode(baseParams, baseValues),
    },
    value,
  };
};

export function hashAssetType(a: AssetType) {
  if (a.assetClass === AssetClassType.INVALID_ASSET_CLASS) {
    throw new Error('Invalid assetClass' + a.assetClass);
  }
  return keccak256(
    AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'uint256', 'bytes32'],
      [ASSET_TYPE_TYPEHASH, a.assetClass, keccak256(a.data)]
    )
  );
}

export function hashAsset(a: Asset) {
  return keccak256(
    AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'bytes32', 'uint256'],
      [ASSET_TYPEHASH, hashAssetType(a.assetType), a.value]
    )
  );
}

export const Bundle = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bundleInformation: any // TODO: type
): Promise<Asset> => ({
  assetType: {
    assetClass: AssetClassType.BUNDLE_ASSET_CLASS,
    data: AbiCoder.defaultAbiCoder().encode(
      [
        'tuple(tuple(address erc20Address, uint256 value)[] bundledERC20, tuple(address erc721Address, uint256[] ids)[] bundledERC721, tuple(address erc1155Address, uint256[] ids, uint256[] supplies)[] bundledERC1155)',
      ],
      [bundleInformation]
    ),
  },
  value: 1,
});
