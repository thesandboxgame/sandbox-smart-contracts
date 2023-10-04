import {ethers} from 'ethers';
import hre from 'hardhat';
import {Contract} from 'ethers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

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

export {
  createAssetMintSignature,
  createMultipleAssetsMintSignature,
  createMockSignature,
  createMockDigest,
};
