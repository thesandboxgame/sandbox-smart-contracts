import {
  AbiCoder,
  BytesLike,
  Contract,
  Numeric,
  Signer,
  ZeroAddress,
} from 'ethers';

export type Order = {
  maker: string;
  makeAsset: Asset;
  taker: string;
  takeAsset: Asset;
  salt: Numeric;
  start: Numeric;
  end: Numeric;
};

export enum AssetClassType {
  INVALID_ASSET_CLASS = '0x0',
  ERC20_ASSET_CLASS = '0x1',
  ERC721_ASSET_CLASS = '0x2',
  ERC1155_ASSET_CLASS = '0x3',
}

export type Asset = {
  assetType: AssetType;
  value: Numeric;
};

export type AssetType = {
  assetClass: AssetClassType;
  data: BytesLike;
};

export const AssetERC1155 = async (
  tokenContract: Contract,
  tokenId: Numeric,
  value: Numeric
): Promise<Asset> => ({
  assetType: {
    assetClass: AssetClassType.ERC1155_ASSET_CLASS,
    data: AbiCoder.defaultAbiCoder().encode(
      ['address', 'uint256'],
      [await tokenContract.getAddress(), tokenId]
    ),
  },
  value,
});

export const AssetERC20 = async (
  tokenContract: Contract,
  value: Numeric
): Promise<Asset> => ({
  assetType: {
    assetClass: AssetClassType.ERC20_ASSET_CLASS,
    data: AbiCoder.defaultAbiCoder().encode(
      ['address'],
      [await tokenContract.getAddress()]
    ),
  },
  value,
});

export async function signOrder(
  order: Order,
  account: Signer,
  verifyingContract: Contract
) {
  return account.signTypedData(
    {
      name: 'The Sandbox Marketplace',
      version: '1.0.0',
      chainId: 31337,
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

export const OrderDefault = async (
  maker: {getAddress: () => Promise<string>},
  makeAsset: Asset,
  taker: Signer | string,
  takeAsset: Asset,
  salt: Numeric,
  start: Numeric,
  end: Numeric
): Promise<Order> => ({
  maker: await maker.getAddress(),
  makeAsset,
  taker:
    taker === ZeroAddress ? ZeroAddress : await (taker as Signer).getAddress(),
  takeAsset,
  salt,
  start,
  end,
});

export const getMatchedOrders = async (
  catalystContract: Contract,
  catalystPrice: Numeric,
  sandContract: Contract,
  orderValidatorContract: Contract,
  catalystTier: BigInt,
  amount: BigInt,
  maker: Signer,
  taker: Signer
) => {
  const makerAsset = await AssetERC1155(
    catalystContract,
    Number(catalystTier),
    Number(amount)
  );
  const takerAsset = await AssetERC20(sandContract, catalystPrice);

  const orderLeft = await OrderDefault(
    maker,
    makerAsset,
    ZeroAddress,
    takerAsset,
    1,
    0,
    0
  );

  const orderRight = await OrderDefault(
    taker,
    takerAsset,
    ZeroAddress,
    makerAsset,
    1,
    0,
    0
  );

  const makerSig = await signOrder(orderLeft, maker, orderValidatorContract);
  const takerSig = await signOrder(orderRight, taker, orderValidatorContract);

  const matchedOrder = [
    {
      orderLeft,
      signatureLeft: makerSig,
      orderRight,
      signatureRight: takerSig,
    },
  ];

  return matchedOrder;
};
