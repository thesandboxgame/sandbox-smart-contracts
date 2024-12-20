import {AbiCoder, Contract, Signer} from 'ethers';
import {Signature} from '@ethersproject/bytes';
import {ethers} from 'hardhat';
import {BytesLike} from '@ethersproject/bytes/src.ts/index';

export enum TokenType {
  INVALID,
  ERC20,
  ERC721,
  ERC721_BATCH,
  ERC721_SAFE,
  ERC721_SAFE_BATCH,
  ERC1155,
  ERC1155_BATCH,
}

export type ClaimEntry = {
  tokenType: TokenType;
  tokenAddress: string;
  data: string;
};

export async function getClaimEntires(claims: Claim[]): Promise<ClaimEntry[]> {
  const ret: ClaimEntry[] = [];
  for (const c of claims) {
    ret.push({
      tokenType: c.tokenType,
      tokenAddress: await c.token.getAddress(),
      data: getClaimData(c),
    });
  }
  return ret;
}

export function compareClaim(a: ClaimEntry[]): (b: ClaimEntry[]) => boolean {
  return (b: ClaimEntry[]) =>
    a.every(
      (x, idx) =>
        x.tokenType == b[idx].tokenType &&
        x.tokenAddress === b[idx].tokenAddress &&
        x.data === b[idx].data
    );
}

export interface ClaimEntryWithContract {
  tokenType: TokenType;
  token: Contract;
}

// For testing
export interface InvalidClaim extends ClaimEntryWithContract {
  tokenType: TokenType.INVALID;
  data: string;
}

export interface ERC20Claim extends ClaimEntryWithContract {
  tokenType: TokenType.ERC20;
  amount: bigint;
}

export interface ERC721Claim extends ClaimEntryWithContract {
  tokenType: TokenType.ERC721 | TokenType.ERC721_SAFE;
  tokenId: bigint;
}

export interface ERC721BatchClaim extends ClaimEntryWithContract {
  tokenType: TokenType.ERC721_BATCH | TokenType.ERC721_SAFE_BATCH;
  tokenIds: bigint[];
}

export interface ERC1155Claim extends ClaimEntryWithContract {
  tokenType: TokenType.ERC1155;
  amount: bigint;
  tokenId: bigint;
  data: BytesLike;
}

export interface ERC1155BatchClaim extends ClaimEntryWithContract {
  tokenType: TokenType.ERC1155_BATCH;
  amounts: bigint[];
  tokenIds: bigint[];
  data: BytesLike;
}

export type Claim =
  | InvalidClaim
  | ERC20Claim
  | ERC721Claim
  | ERC721BatchClaim
  | ERC1155Claim
  | ERC1155BatchClaim;
export const getClaimData = function (claim: Claim): string {
  switch (claim.tokenType) {
    case TokenType.ERC20:
      return AbiCoder.defaultAbiCoder().encode(['uint256'], [claim.amount]);
    case TokenType.ERC721:
    case TokenType.ERC721_SAFE:
      return AbiCoder.defaultAbiCoder().encode(['uint256'], [claim.tokenId]);
    case TokenType.ERC721_BATCH:
    case TokenType.ERC721_SAFE_BATCH:
      return AbiCoder.defaultAbiCoder().encode(['uint256[]'], [claim.tokenIds]);
    case TokenType.ERC1155:
      return AbiCoder.defaultAbiCoder().encode(
        ['uint256', 'uint256', 'bytes'],
        [claim.tokenId, claim.amount.toString(), ethers.getBytes(claim.data)]
      );
    case TokenType.ERC1155_BATCH:
      return AbiCoder.defaultAbiCoder().encode(
        ['uint256[]', 'uint256[]', 'bytes'],
        [claim.tokenIds, claim.amounts, ethers.getBytes(claim.data)]
      );
    default:
      throw new Error('Invalid type:' + (claim as Claim).tokenType);
  }
};

export const signedMultiGiveawaySignature = async function (
  contract: Contract,
  signer: Signer,
  claimIds: bigint[],
  expiration: number,
  from: string,
  to: string,
  claims: ClaimEntry[],
  privateKey = ''
): Promise<Signature> {
  const n = await contract.runner?.provider?.getNetwork();
  const chainId = n.chainId;

  const data = {
    types: {
      ClaimEntry: [
        {name: 'tokenType', type: 'uint256'},
        {name: 'tokenAddress', type: 'address'},
        {name: 'data', type: 'bytes'},
      ],
      Claim: [
        {name: 'claimIds', type: 'uint256[]'},
        {name: 'expiration', type: 'uint256'},
        {name: 'from', type: 'address'},
        {name: 'to', type: 'address'},
        {name: 'claims', type: 'ClaimEntry[]'},
      ],
    },
    primaryType: 'Claim',
    domain: {
      name: 'Sandbox SignedMultiGiveaway',
      version: '1.0',
      chainId: chainId.toString(),
      verifyingContract: await contract.getAddress(),
    },
    message: {
      claimIds: claimIds.map((x) => x.toString()),
      expiration,
      from,
      to,
      claims,
    },
  };

  if (privateKey) {
    signer = new ethers.Wallet(privateKey);
  }
  const signature = await signer.signTypedData(
    data.domain,
    data.types,
    data.message
  );
  return ethers.Signature.from(signature);
};
