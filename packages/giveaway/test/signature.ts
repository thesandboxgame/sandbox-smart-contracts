import {BigNumberish, Contract} from 'ethers';
import {Signature} from '@ethersproject/bytes';
import {ethers} from 'hardhat';
import {signTypedData_v4} from 'eth-sig-util';
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

export function compareClaim(a: Claim[]): (b: ClaimEntry[]) => boolean {
  return (b: ClaimEntry[]) =>
    a.every(
      (x, idx) =>
        x.tokenType === b[idx].tokenType &&
        x.token.address === b[idx].tokenAddress &&
        getClaimData(x) === b[idx].data
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
      return ethers.utils.defaultAbiCoder.encode(['uint256'], [claim.amount]);
    case TokenType.ERC721:
    case TokenType.ERC721_SAFE:
      return ethers.utils.defaultAbiCoder.encode(['uint256'], [claim.tokenId]);
    case TokenType.ERC721_BATCH:
    case TokenType.ERC721_SAFE_BATCH:
      return ethers.utils.defaultAbiCoder.encode(
        ['uint256[]'],
        [claim.tokenIds]
      );
    case TokenType.ERC1155:
      return ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'uint256', 'bytes'],
        [
          claim.tokenId,
          claim.amount.toString(),
          ethers.utils.arrayify(claim.data),
        ]
      );
    case TokenType.ERC1155_BATCH:
      return ethers.utils.defaultAbiCoder.encode(
        ['uint256[]', 'uint256[]', 'bytes'],
        [claim.tokenIds, claim.amounts, ethers.utils.arrayify(claim.data)]
      );
    default:
      throw new Error('Invalid type:' + (claim as Claim).tokenType);
  }
};

export function getClaimEntires(claims: Claim[]): ClaimEntry[] {
  return claims.map((x) => ({
    tokenType: x.tokenType,
    tokenAddress: x.token.address,
    data: getClaimData(x),
  }));
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
  const chainId = (await contract.provider.getNetwork()).chainId;

  const data = {
    types: {
      EIP712Domain: [
        {
          name: 'name',
          type: 'string',
        },
        {
          name: 'version',
          type: 'string',
        },
        {
          name: 'chainId',
          type: 'uint256',
        },
        {
          name: 'verifyingContract',
          type: 'address',
        },
      ],
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
      verifyingContract: contract.address,
    },
    message: {
      claimIds: claimIds.map((x) => x.toString()),
      expiration,
      from,
      to,
      claims,
    },
  } as never;

  let signature;
  if (privateKey) {
    signature = signTypedData_v4(ethers.utils.arrayify(privateKey) as Buffer, {
      data,
    });
  } else {
    signature = await ethers.provider.send('eth_signTypedData_v4', [
      signer,
      data,
    ]);
  }
  return ethers.utils.splitSignature(signature);
};
