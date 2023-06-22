import hre, { ethers } from "hardhat";

async function createEIP712RevealSignature(
  amounts: number[],
  prevTokenId: number,
  metadataHashes: string[]
): Promise<string> {
  // get named accounts from hardhat
  const { getNamedAccounts } = hre;
  const { backendAuthWallet } = await getNamedAccounts();

  const AssetRevealContract = await ethers.getContract(
    "AssetReveal",
    backendAuthWallet
  );

  const signer = ethers.provider.getSigner(backendAuthWallet);
  const data = {
    types: {
      Reveal: [
        { name: "prevTokenId", type: "uint256" },
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
      prevTokenId: prevTokenId,
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

const createAssetMintSignature = async (
  creator: string,
  tier: number,
  amount: number,
  revealed: boolean,
  metadataHash: string
) => {
  const { getNamedAccounts } = hre;
  const { backendAuthWallet } = await getNamedAccounts();
  const signer = ethers.provider.getSigner(backendAuthWallet);

  const AssetCreateContract = await ethers.getContract(
    "AssetCreate",
    backendAuthWallet
  );

  const nonce = await AssetCreateContract.signatureNonces(creator);

  const data = {
    types: {
      Mint: [
        { name: "creator", type: "address" },
        { name: "nonce", type: "uint16" },
        { name: "tier", type: "uint8" },
        { name: "amount", type: "uint256" },
        { name: "revealed", type: "bool" },
        { name: "metadataHash", type: "string" },
      ],
    },
    domain: {
      name: "Sandbox Asset Create",
      version: "1.0",
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
  metadataHashes: string[]
) => {
  const { getNamedAccounts } = hre;
  const { backendAuthWallet } = await getNamedAccounts();
  const signer = ethers.provider.getSigner(backendAuthWallet);

  const AssetCreateContract = await ethers.getContract(
    "AssetCreate",
    backendAuthWallet
  );

  const nonce = await AssetCreateContract.signatureNonces(creator);
  const data = {
    types: {
      MintBatch: [
        { name: "creator", type: "address" },
        { name: "nonce", type: "uint16" },
        { name: "tiers", type: "uint8[]" },
        { name: "amounts", type: "uint256[]" },
        { name: "revealed", type: "bool[]" },
        { name: "metadataHashes", type: "string[]" },
      ],
    },
    domain: {
      name: "Sandbox Asset Create",
      version: "1.0",
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
const createSpecialAssetMintSignature = async () => {};

export {
  createEIP712RevealSignature,
  createAssetMintSignature,
  createMultipleAssetsMintSignature,
  createSpecialAssetMintSignature,
};
