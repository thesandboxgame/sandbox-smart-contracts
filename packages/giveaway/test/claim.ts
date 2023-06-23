import {BigNumberish, Contract, PopulatedTransaction} from 'ethers';
import {BytesLike, Hexable} from '@ethersproject/bytes/src.ts/index';
import {ethers} from 'hardhat';

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

export interface ClaimEntryWithContract {
  tokenType: TokenType;
  token: Contract;
}

// For testing
export interface InvalidClaim extends ClaimEntryWithContract {
  tokenType: TokenType.INVALID;
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
    case TokenType.INVALID:
      return '0x';
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

export function getClaimEntries(claims: Claim[]) {
  return claims.map((x) => ({
    tokenType: x.tokenType,
    tokenAddress: x.token.address,
    data: getClaimData(x),
  }));
}

export async function getPopulatedTx(
  from: string,
  to: string,
  claim: Claim,
  contract: Contract,
  tokens: {erc20: Contract; erc1155: Contract; erc721: Contract}
): Promise<PopulatedTransaction> {
  switch (claim.tokenType) {
    case TokenType.ERC20:
      if (contract.address != from) {
        return tokens.erc20.populateTransaction.transferFrom(
          from,
          to,
          claim.amount
        );
      }
      return tokens.erc20.populateTransaction.transfer(to, claim.amount);
    case TokenType.ERC721:
      return tokens.erc721.populateTransaction.transferFrom(
        from,
        to,
        claim.tokenId
      );
    case TokenType.ERC721_SAFE:
      return tokens.erc721.populateTransaction[
        'safeTransferFrom(address,address,uint256)'
      ](from, to, claim.tokenId);
    case TokenType.ERC721_BATCH:
      throw new Error('Unimplemented');
    case TokenType.ERC721_SAFE_BATCH:
      throw new Error('Unimplemented');
    case TokenType.ERC1155:
      return tokens.erc1155.populateTransaction.safeTransferFrom(
        from,
        to,
        claim.tokenId,
        claim.amount,
        claim.data
      );
    case TokenType.ERC1155_BATCH:
      return tokens.erc1155.populateTransaction.safeBatchTransferFrom(
        from,
        to,
        claim.tokenIds,
        claim.amounts,
        claim.data
      );
    default:
      throw new Error('Invalid type:' + (claim as Claim).tokenType);
  }
}
