import { JsonRpcSigner } from "@ethersproject/providers";

async function createEIP712RevealSignature(
  signer: JsonRpcSigner,
  chainId: number,
  creator: string,
  amount: number,
  prevTokenId: number,
  metadataHashes: string[],
  verifyingContract: string
): Promise<string> {
  const data = {
    types: {
      Reveal: [
        { name: "creator", type: "address" },
        { name: "prevTokenId", type: "uint256" },
        { name: "amount", type: "uint256" },
        { name: "metadataHashes", type: "string[]" },
      ],
    },
    domain: {
      name: "Sandbox Asset Reveal",
      version: "1.0",
      chainId,
      verifyingContract,
    },
    message: {
      creator: creator,
      prevTokenId: prevTokenId,
      amount,
      metadataHashes: metadataHashes,
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
