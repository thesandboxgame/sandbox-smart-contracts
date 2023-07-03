import {AbiCoder, BigNumberish, Contract, Wallet} from 'ethers';
import {Signature} from '@ethersproject/bytes';
import {ethers} from 'hardhat';
import {BytesLike, Hexable} from '@ethersproject/bytes/src.ts/index';

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

export function compareClaimEntries(
  a: ClaimEntry[]
): (b: ClaimEntry[]) => boolean {
  return (b: ClaimEntry[]) => {
    return a.every(
      (x, idx) =>
        BigInt(x.tokenType) === BigInt(b[idx].tokenType) &&
        x.tokenAddress === b[idx].tokenAddress &&
        x.data === b[idx].data
    );
  };
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
  amount: BigNumberish;
}

export interface ERC721Claim extends ClaimEntryWithContract {
  tokenType: TokenType.ERC721 | TokenType.ERC721_SAFE;
  tokenId: BigNumberish;
}

export interface ERC721BatchClaim extends ClaimEntryWithContract {
  tokenType: TokenType.ERC721_BATCH | TokenType.ERC721_SAFE_BATCH;
  tokenIds: BigNumberish[];
}

export interface ERC1155Claim extends ClaimEntryWithContract {
  tokenType: TokenType.ERC1155;
  amount: BigNumberish;
  tokenId: BigNumberish;
  data: BytesLike | Hexable | number;
}

export interface ERC1155BatchClaim extends ClaimEntryWithContract {
  tokenType: TokenType.ERC1155_BATCH;
  amounts: BigNumberish[];
  tokenIds: BigNumberish[];
  data: BytesLike | Hexable | number;
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

export async function getClaimEntires(claims: Claim[]): Promise<ClaimEntry[]> {
  const ret: ClaimEntry[] = [];
  for (const x of claims) {
    ret.push({
      tokenType: x.tokenType,
      tokenAddress: await x.token.getAddress(),
      data: getClaimData(x),
    });
  }
  return ret;
}

export const signedMultiGiveawaySignature = async function (
  contract: Contract,
  signer: string,
  claimIds: BigNumberish[],
  expiration: number,
  from: string,
  to: string,
  claims: ClaimEntry[],
  privateKey = ''
): Promise<Signature> {
  const provider = contract.runner?.provider;
  if (!provider) {
    throw new Error('Missing provider');
  }
  const chainId = (await provider.getNetwork()).chainId;

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

  const wallet = privateKey
    ? new Wallet(privateKey, ethers.provider)
    : await ethers.getSigner(signer);
  const signature = await wallet.signTypedData(
    data.domain,
    {
      ClaimEntry: data.types.ClaimEntry,
      Claim: data.types.Claim,
    },
    data.message
  );
  return ethers.Signature.from(signature);
};
