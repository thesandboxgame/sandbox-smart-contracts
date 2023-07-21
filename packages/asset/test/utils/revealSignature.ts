import hre from 'hardhat';
import {Contract} from 'ethers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

async function burnAndRevealSignature(
  recipient: string,
  prevTokenId: number,
  amounts: number[],
  metadataHashes: string[],
  revealHashes: string[],
  contract: Contract,
  signer: SignerWithAddress
): Promise<string> {
  const AssetRevealContract = contract;
  const data = {
    types: {
      InstantReveal: [
        {name: 'recipient', type: 'address'},
        {name: 'prevTokenId', type: 'uint256'},
        {name: 'amounts', type: 'uint256[]'},
        {name: 'metadataHashes', type: 'string[]'},
        {name: 'revealHashes', type: 'bytes32[]'},
      ],
    },
    domain: {
      name: 'Sandbox Asset Reveal',
      version: '1.0',
      chainId: hre.network.config.chainId,
      verifyingContract: AssetRevealContract.address,
    },
    message: {
      recipient,
      prevTokenId,
      amounts,
      metadataHashes,
      revealHashes,
    },
  };
  const signature = await signer._signTypedData(
    data.domain,
    data.types,
    data.message
  );
  return signature;
}

async function batchRevealSignature(
  recipient: string,
  prevTokenIds: number[],
  amounts: number[][],
  metadataHashes: string[][],
  revealHashes: string[][],
  contract: Contract,
  signer: SignerWithAddress
): Promise<string> {
  const AssetRevealContract = contract;
  const data = {
    types: {
      BatchReveal: [
        {name: 'recipient', type: 'address'},
        {name: 'prevTokenIds', type: 'uint256[]'},
        {name: 'amounts', type: 'uint256[][]'},
        {name: 'metadataHashes', type: 'string[][]'},
        {name: 'revealHashes', type: 'bytes32[][]'},
      ],
    },
    domain: {
      name: 'Sandbox Asset Reveal',
      version: '1.0',
      chainId: hre.network.config.chainId,
      verifyingContract: AssetRevealContract.address,
    },
    message: {
      recipient,
      prevTokenIds,
      amounts,
      metadataHashes,
      revealHashes,
    },
  };

  const signature = await signer._signTypedData(
    data.domain,
    data.types,
    data.message
  );
  return signature;
}

async function revealSignature(
  recipient: string,
  prevTokenId: number,
  amounts: number[],
  metadataHashes: string[],
  revealHashes: string[],
  contract: Contract,
  signer: SignerWithAddress
): Promise<string> {
  const AssetRevealContract = contract;
  const data = {
    types: {
      Reveal: [
        {name: 'recipient', type: 'address'},
        {name: 'prevTokenId', type: 'uint256'},
        {name: 'amounts', type: 'uint256[]'},
        {name: 'metadataHashes', type: 'string[]'},
        {name: 'revealHashes', type: 'bytes32[]'},
      ],
    },
    domain: {
      name: 'Sandbox Asset Reveal',
      version: '1.0',
      chainId: hre.network.config.chainId,
      verifyingContract: AssetRevealContract.address,
    },
    message: {
      recipient,
      prevTokenId,
      amounts,
      metadataHashes,
      revealHashes,
    },
  };

  const signature = await signer._signTypedData(
    data.domain,
    data.types,
    data.message
  );
  return signature;
}

export {burnAndRevealSignature, batchRevealSignature, revealSignature};
