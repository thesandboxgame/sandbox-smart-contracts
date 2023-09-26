// AssetXXX represents something you want to trade, for example:
// "20 eth" == AssetETH(20), "11 Sand" == AssetERC20(SandTokenAddress, 11)
// some NFT" == AssetERC721(nftContractAddress, tokenId), etc
// SEE: LibAsset.sol
import {
  AbiCoder,
  Numeric,
  BytesLike,
  Contract,
  keccak256,
  solidityPackedKeccak256,
} from 'ethers';
import {bytes4Keccak, HashSignature} from './signature';

export const ETH_ASSET_CLASS = bytes4Keccak('ETH');
export const ERC20_ASSET_CLASS = bytes4Keccak('ERC20');
export const ERC721_ASSET_CLASS = bytes4Keccak('ERC721');
export const ERC1155_ASSET_CLASS = bytes4Keccak('ERC1155');
// export const ERC721_TSB_CLASS = bytes4Keccak('ERC721_TSB');
// export const ERC1155_TSB_CLASS = bytes4Keccak('ERC1155_TSB');
export const BUNDLE_ASSET_CLASS = bytes4Keccak('BUNDLE');

// TODO: export const ERC721_LAZY_ASSET_CLASS = bytes4Keccak('ERC721_LAZY');
export const ASSET_TYPE_TYPEHASH = keccak256(
  Buffer.from('AssetType(bytes4 assetClass,bytes data)')
);
export const ASSET_TYPEHASH = keccak256(
  Buffer.from(
    'Asset(AssetType assetType,uint256 value)AssetType(bytes4 assetClass,bytes data)'
  )
);

export type AssetType = {
  assetClass: HashSignature;
  data: BytesLike;
};

export type Asset = {
  assetType: AssetType;
  value: Numeric;
};

export const AssetETH = (value: Numeric): Asset => ({
  assetType: {
    assetClass: ETH_ASSET_CLASS,
    data: '0x',
  },
  value,
});

export const AssetERC20 = async (
  tokenContract: Contract,
  value: Numeric
): Promise<Asset> => ({
  assetType: {
    assetClass: ERC20_ASSET_CLASS,
    data: AbiCoder.defaultAbiCoder().encode(
      ['address'],
      [await tokenContract.getAddress()]
    ),
  },
  value: value,
});

export const AssetERC721 = async (
  tokenContract: Contract,
  tokenId: Numeric
): Promise<Asset> => ({
  assetType: {
    assetClass: ERC721_ASSET_CLASS,
    data: AbiCoder.defaultAbiCoder().encode(
      ['address', 'uint256'],
      [await tokenContract.getAddress(), tokenId]
    ),
  },
  // TODO: Test value !=1
  value: 1,
});

export const AssetERC1155 = async (
  tokenContract: Contract,
  tokenId: Numeric,
  value: Numeric
): Promise<Asset> => ({
  assetType: {
    assetClass: ERC1155_ASSET_CLASS,
    data: AbiCoder.defaultAbiCoder().encode(
      ['address', 'uint256'],
      [await tokenContract.getAddress(), tokenId]
    ),
  },
  value: value,
});

export const AssetBundle = async (
  erc20: {token: Contract; value: Numeric}[],
  erc721: {
    token: Contract;
    tokenId: Numeric;
  }[],
  erc1155: {
    token: Contract;
    tokenId: Numeric;
    value: Numeric;
  }[]
): Promise<Asset> => {
  const erc20Details = [];
  for (const x of erc20) {
    erc20Details.push([await x.token.getAddress(), x.value]);
  }
  const erc721Details = [];
  for (const x of erc721) {
    erc721Details.push([
      await x.token.getAddress(),
      x.tokenId,
      // TODO: Test value !=1
      1,
    ]);
  }
  const erc1155Details = [];
  for (const x of erc1155) {
    erc1155Details.push([await x.token.getAddress(), x.tokenId, x.value]);
  }
  return {
    assetType: {
      assetClass: BUNDLE_ASSET_CLASS,
      data: AbiCoder.defaultAbiCoder().encode(
        [
          'tuple(address, uint256)[]',
          'tuple(address, uint256, uint256)[]',
          'tuple(address, uint256, uint256)[]',
        ],
        [erc20Details, erc721Details, erc1155Details]
      ),
    },
    // TODO: It make sense tho have multipler bundles >1 ????
    value: 1,
  };
};

export function hashAssetType(a: AssetType) {
  if (a.assetClass.length !== 10) {
    throw new Error('Invalid assetClass' + a.assetClass);
  }
  // There is aproblem with solidityPackedKeccak256 and byte4 =>  a.assetClass + '0'.repeat(56)
  return solidityPackedKeccak256(
    ['bytes32', 'bytes32', 'bytes32'],
    [ASSET_TYPE_TYPEHASH, a.assetClass + '0'.repeat(56), keccak256(a.data)]
  );
}

export function hashAsset(a: Asset) {
  return solidityPackedKeccak256(
    ['bytes32', 'bytes32', 'uint256'],
    [ASSET_TYPEHASH, hashAssetType(a.assetType), a.value]
  );
}
