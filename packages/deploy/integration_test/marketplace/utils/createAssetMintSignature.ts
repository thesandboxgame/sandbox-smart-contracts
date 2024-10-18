import {Signer} from 'ethers';

export async function createAssetMintSignature(
  creator: string,
  tier: number,
  amount: number,
  nonce: number,
  revealed: boolean,
  metadataHash: string,
  AssetCreate: string,
  signer: Signer
) {
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
      chainId: 80002,
      verifyingContract: AssetCreate,
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

  const signature = await signer.signTypedData(
    data.domain,
    data.types,
    data.message
  );
  return signature;
}

export async function generateTokenId(
  creator: string,
  tier: number,
  creatorNonce: number,
  revealNonce: number
): Promise<bigint> {
  // Convert the hexadecimal Ethereum address string to BigInt
  const creatorAddress = BigInt(creator);

  const tokenId =
    creatorAddress |
    (BigInt(tier) << BigInt(160)) |
    (BigInt(creatorNonce) << BigInt(168)) |
    (BigInt(revealNonce) << BigInt(184)) |
    (BigInt(0) << BigInt(200)); // bridged is always 0

  return tokenId;
}
