import {
  AbiCoder,
  BytesLike,
  Contract,
  Numeric,
  Signer,
  ZeroAddress,
} from 'ethers';
import {ethers} from 'hardhat';
import {Network} from 'hardhat/types';

export type LazyMintData = {
  caller: string;
  tier: bigint;
  amount: bigint;
  unitPrice: bigint;
  paymentToken: string;
  metadataHash: string;
  maxSupply: bigint;
  creator: string;
};

export type LazyMintBatchData = {
  caller: string;
  tiers: bigint[];
  amounts: bigint[];
  unitPrices: bigint[];
  paymentTokens: string[];
  metadataHashes: string[];
  maxSupplies: bigint[];
  creators: string[];
};

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

const getRandomInt = (max: number) => {
  return Math.floor(Math.random() * max);
};

export const getMatchedOrders = async (
  catalystContract: Contract,
  catalystPrice: Numeric,
  sandContract: Contract,
  orderValidatorContract: Contract,
  catalystTier: bigint,
  amount: bigint,
  maker: Signer,
  taker: Signer
) => {
  const makerAsset = await AssetERC1155(
    catalystContract,
    Number(catalystTier),
    Number(amount)
  );
  const takerAsset = await AssetERC20(sandContract, catalystPrice);

  const randomSalt = getRandomInt(1000000);

  const orderLeft = await OrderDefault(
    maker,
    makerAsset,
    ZeroAddress,
    takerAsset,
    randomSalt,
    0,
    0
  );

  const orderRight = await OrderDefault(
    taker,
    takerAsset,
    ZeroAddress,
    makerAsset,
    randomSalt,
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

export const createLazyMintSignature = async (
  data: LazyMintData,
  AssetCreateContract: Contract,
  network: Network
) => {
  const {
    caller,
    tier,
    amount,
    unitPrice,
    paymentToken,
    metadataHash,
    maxSupply,
    creator,
  } = data;
  const nonce = await AssetCreateContract.signatureNonces(caller);

  const backendAuthWallet = new ethers.Wallet(
    '0x4242424242424242424242424242424242424242424242424242424242424242'
  );

  const sigData = {
    types: {
      LazyMint: [
        {name: 'caller', type: 'address'},
        {name: 'creator', type: 'address'},
        {name: 'nonce', type: 'uint16'},
        {name: 'tier', type: 'uint8'},
        {name: 'amount', type: 'uint256'},
        {name: 'unitPrice', type: 'uint256'},
        {name: 'paymentToken', type: 'address'},
        {name: 'metadataHash', type: 'string'},
        {name: 'maxSupply', type: 'uint256'},
      ],
    },
    domain: {
      name: 'Sandbox Asset Create',
      version: '1.0',
      chainId: network.config.chainId,
      verifyingContract: await AssetCreateContract.getAddress(),
    },
    message: {
      caller,
      creator,
      nonce,
      tier,
      amount,
      unitPrice,
      paymentToken,
      metadataHash,
      maxSupply,
    },
  };

  const signature = await backendAuthWallet.signTypedData(
    sigData.domain,
    sigData.types,
    sigData.message
  );
  return signature;
};

export const createMultipleLazyMintSignature = async (
  data: LazyMintBatchData,
  AssetCreateContract: Contract,
  network: Network
) => {
  const {
    caller,
    creators,
    tiers,
    amounts,
    unitPrices,
    paymentTokens,
    metadataHashes,
    maxSupplies,
  } = data;
  const nonce = await AssetCreateContract.signatureNonces(caller);
  const backendAuthWallet = new ethers.Wallet(
    '0x4242424242424242424242424242424242424242424242424242424242424242'
  );

  const sigData = {
    types: {
      LazyMintBatch: [
        {name: 'caller', type: 'address'},
        {name: 'creators', type: 'address[]'},
        {name: 'nonce', type: 'uint16'},
        {name: 'tiers', type: 'uint8[]'},
        {name: 'amounts', type: 'uint256[]'},
        {name: 'unitPrices', type: 'uint256[]'},
        {name: 'paymentTokens', type: 'address[]'},
        {name: 'metadataHashes', type: 'string[]'},
        {name: 'maxSupplies', type: 'uint256[]'},
      ],
    },
    domain: {
      name: 'Sandbox Asset Create',
      version: '1.0',
      chainId: network.config.chainId,
      verifyingContract: await AssetCreateContract.getAddress(),
    },
    message: {
      caller,
      creators,
      nonce,
      tiers,
      amounts,
      unitPrices,
      paymentTokens,
      metadataHashes,
      maxSupplies,
    },
  };

  const signature = await backendAuthWallet.signTypedData(
    sigData.domain,
    sigData.types,
    sigData.message
  );
  return signature;
};

export const giveSandToAccount = async (
  SandContract: Contract,
  account: string,
  amount: bigint
) => {
  // Give sand to lazyMintingTestAccount1
  // impersonate CHILD_CHAIN_MANAGER
  await ethers.provider.send('hardhat_impersonateAccount', [
    '0x8464135c8F25Da09e49BC8782676a84730C318bC',
  ]);
  const sandUser = await ethers.provider.getSigner(
    '0x8464135c8F25Da09e49BC8782676a84730C318bC'
  );

  // give sandUser ether
  await ethers.provider.send('hardhat_setBalance', [
    '0x8464135c8F25Da09e49BC8782676a84730C318bC',
    '0x100000000000000000000',
  ]);

  const abiCoder = new ethers.AbiCoder();

  // call deposit on PolygonSand contract via function deposit(address user, bytes calldata depositData)
  await SandContract.connect(sandUser).deposit(
    account,
    abiCoder.encode(['uint256'], [amount])
  );

  // stop impersonating
  await ethers.provider.send('hardhat_stopImpersonatingAccount', [
    '0x8464135c8F25Da09e49BC8782676a84730C318bC',
  ]);
};
