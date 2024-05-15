import {BigNumber, ethers} from 'ethers';
import hre from 'hardhat';
import {Contract} from 'ethers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

export type LazyMintBatchData = {
  caller: string;
  tiers: number[];
  amounts: number[];
  unitPrices: BigNumber[];
  paymentTokens: string[];
  metadataHashes: string[];
  maxSupplies: number[];
  creators: string[];
  expirationTime: number;
};

export type LazyMintData = {
  caller: string;
  tier: number;
  amount: number;
  unitPrice: BigNumber;
  paymentToken: string;
  metadataHash: string;
  maxSupply: number;
  creator: string;
  expirationTime: number;
};

const createAssetMintSignature = async (
  creator: string,
  tier: number,
  amount: number,
  revealed: boolean,
  metadataHash: string,
  contract: Contract,
  signer: SignerWithAddress
) => {
  const AssetCreateContract = contract;
  const nonce = await AssetCreateContract.signatureNonces(creator);

  const data = {
    types: {
      Mint: [
        {name: 'creator', type: 'address'},
        {name: 'nonce', type: 'uint16'},
        {name: 'tier', type: 'uint8'},
        {name: 'amount', type: 'uint256'},
        {name: 'revealed', type: 'bool'},
        {name: 'metadataHash', type: 'string'},
      ],
    },
    domain: {
      name: 'Sandbox Asset Create',
      version: '1.0',
      chainId: hre.network.config.chainId,
      verifyingContract: AssetCreateContract.address,
    },
    message: {
      creator,
      nonce,
      tier,
      amount,
      revealed,
      metadataHash,
    },
  };

  const signature = await signer._signTypedData(
    data.domain,
    data.types,
    data.message
  );
  return signature;
};

const createMultipleAssetsMintSignature = async (
  creator: string,
  tiers: number[],
  amounts: number[],
  revealed: boolean[],
  metadataHashes: string[],
  contract: Contract,
  signer: SignerWithAddress
) => {
  const AssetCreateContract = contract;
  const nonce = await AssetCreateContract.signatureNonces(creator);
  const data = {
    types: {
      MintBatch: [
        {name: 'creator', type: 'address'},
        {name: 'nonce', type: 'uint16'},
        {name: 'tiers', type: 'uint8[]'},
        {name: 'amounts', type: 'uint256[]'},
        {name: 'revealed', type: 'bool[]'},
        {name: 'metadataHashes', type: 'string[]'},
      ],
    },
    domain: {
      name: 'Sandbox Asset Create',
      version: '1.0',
      chainId: hre.network.config.chainId,
      verifyingContract: AssetCreateContract.address,
    },
    message: {
      creator,
      nonce,
      tiers,
      amounts,
      revealed,
      metadataHashes,
    },
  };

  const signature = await signer._signTypedData(
    data.domain,
    data.types,
    data.message
  );
  return signature;
};

const createMockSignature = async (
  creator: string,
  signer: SignerWithAddress
) => {
  const data = {
    types: {
      Basic: [{name: 'creator', type: 'address'}],
    },
    domain: {
      name: 'The Sandbox',
      version: '1.0',
      chainId: hre.network.config.chainId,
    },
    message: {
      creator,
    },
  };

  const signature = await signer._signTypedData(
    data.domain,
    data.types,
    data.message
  );

  const digest = ethers.utils._TypedDataEncoder.hash(
    data.domain,
    data.types,
    data.message
  );

  return {signature, digest};
};

const createMockDigest = async (creator: string) => {
  const data = {
    types: {
      Basic: [{name: 'creator', type: 'address'}],
    },
    domain: {
      name: 'The Sandbox',
      version: '1.0',
      chainId: hre.network.config.chainId,
    },
    message: {
      creator,
    },
  };
  const digest = ethers.utils._TypedDataEncoder.hash(
    data.domain,
    data.types,
    data.message
  );

  return digest;
};

const createLazyMintSignature = async (
  mintData: LazyMintData,
  contract: Contract,
  signer: SignerWithAddress
) => {
  const AssetCreateContract = contract;

  const {
    caller,
    creator,
    tier,
    amount,
    unitPrice,
    paymentToken,
    metadataHash,
    maxSupply,
    expirationTime,
  } = mintData;

  const nonce = await AssetCreateContract.signatureNonces(caller);

  const data = {
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
        {name: 'expirationTime', type: 'uint256'},
      ],
    },
    domain: {
      name: 'Sandbox Asset Create',
      version: '1.0',
      chainId: hre.network.config.chainId,
      verifyingContract: AssetCreateContract.address,
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
      expirationTime,
    },
  };

  const signature = await signer._signTypedData(
    data.domain,
    data.types,
    data.message
  );
  return signature;
};

const createLazyMintMultipleAssetsSignature = async (
  mintData: LazyMintBatchData,
  contract: Contract,
  signer: SignerWithAddress
) => {
  const AssetCreateContract = contract;
  const {
    caller,
    creators,
    tiers,
    amounts,
    unitPrices,
    paymentTokens,
    maxSupplies,
    metadataHashes,
    expirationTime,
  } = mintData;
  const nonce = await AssetCreateContract.signatureNonces(caller);
  const data = {
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
        {name: 'expirationTime', type: 'uint256'},
      ],
    },
    domain: {
      name: 'Sandbox Asset Create',
      version: '1.0',
      chainId: hre.network.config.chainId,
      verifyingContract: AssetCreateContract.address,
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
      expirationTime,
    },
  };

  const signature = await signer._signTypedData(
    data.domain,
    data.types,
    data.message
  );
  return signature;
};

export {
  createAssetMintSignature,
  createMultipleAssetsMintSignature,
  createMockSignature,
  createMockDigest,
  createLazyMintSignature,
  createLazyMintMultipleAssetsSignature,
};
