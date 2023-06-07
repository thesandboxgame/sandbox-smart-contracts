import hre, { ethers } from "hardhat";

async function createEIP712RevealSignature(
  amounts: number[],
  prevTokenId: number,
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

export { createEIP712RevealSignature };
