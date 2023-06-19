import hre, { ethers } from "hardhat";

async function createBurnAndRevealSignature(
  recipient: string,
  amounts: number[],
  prevTokenId: number,
  nonce: number,
  metadataHashes: string[]
): Promise<string> {
  const { getNamedAccounts } = hre;
  const { backendSigner } = await getNamedAccounts();

  const AssetRevealContract = await ethers.getContract(
    "AssetReveal",
    backendSigner
  );
  const signer = ethers.provider.getSigner(backendSigner);

  const data = {
    types: {
      InstantReveal: [
        { name: "recipient", type: "address" },
        { name: "prevTokenId", type: "uint256" },
        { name: "nonce", type: "uint32" },
        { name: "amounts", type: "uint256[]" },
        { name: "metadataHashes", type: "string[]" },
      ],
    },
    domain: {
      name: "Sandbox Asset Reveal",
      version: "1.0",
      chainId: hre.network.config.chainId,
      verifyingContract: AssetRevealContract.address,
    },
    message: {
      recipient,
      prevTokenId,
      nonce,
      amounts,
      metadataHashes,
    },
  };

  // @ts-ignore
  const signature = await signer._signTypedData(
    data.domain,
    data.types,
    data.message
  );
  return signature;
}

async function createBatchRevealSignature(
  recipient: string,
  amounts: number[][],
  prevTokenIds: number[],
  nonce: number,
  metadataHashes: string[][]
): Promise<string> {
  // get named accounts from hardhat
  const { getNamedAccounts } = hre;
  const { backendSigner } = await getNamedAccounts();

  const AssetRevealContract = await ethers.getContract(
    "AssetReveal",
    backendSigner
  );

  const signer = ethers.provider.getSigner(backendSigner);
  const data = {
    types: {
      BatchReveal: [
        { name: "recipient", type: "address" },
        { name: "prevTokenIds", type: "uint256[]" },
        { name: "nonce", type: "uint32" },
        { name: "amounts", type: "uint256[][]" },
        { name: "metadataHashes", type: "string[][]" },
      ],
    },
    domain: {
      name: "Sandbox Asset Reveal",
      version: "1.0",
      chainId: hre.network.config.chainId,
      verifyingContract: AssetRevealContract.address,
    },
    message: {
      recipient,
      prevTokenIds,
      nonce,
      amounts,
      metadataHashes,
    },
  };

  // @ts-ignore
  const signature = await signer._signTypedData(
    data.domain,
    data.types,
    data.message
  );
  return signature;
}

async function createRevealSignature(
  recipient: string,
  amounts: number[],
  prevTokenId: number,
  nonce: number,
  metadataHashes: string[]
): Promise<string> {
  // get named accounts from hardhat
  const { getNamedAccounts } = hre;
  const { backendSigner } = await getNamedAccounts();

  const AssetRevealContract = await ethers.getContract(
    "AssetReveal",
    backendSigner
  );

  const signer = ethers.provider.getSigner(backendSigner);
  const data = {
    types: {
      Reveal: [
        { name: "recipient", type: "address" },
        { name: "prevTokenId", type: "uint256" },
        { name: "nonce", type: "uint32" },
        { name: "amounts", type: "uint256[]" },
        { name: "metadataHashes", type: "string[]" },
      ],
    },
    domain: {
      name: "Sandbox Asset Reveal",
      version: "1.0",
      chainId: hre.network.config.chainId,
      verifyingContract: AssetRevealContract.address,
    },
    message: {
      recipient,
      prevTokenId,
      nonce,
      amounts,
      metadataHashes,
    },
  };

  // @ts-ignore
  const signature = await signer._signTypedData(
    data.domain,
    data.types,
    data.message
  );
  return signature;
}

export {
  createBurnAndRevealSignature,
  createBatchRevealSignature,
  createRevealSignature,
};
