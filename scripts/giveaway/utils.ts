import fs from 'fs';
import {TheGraph} from '../utils/thegraph';

export const isPolygon = process.argv.indexOf('--polygon') > -1;

export const multigiveawayPath = isPolygon
  ? `${__dirname}/proofs/polygon`
  : `${__dirname}/proofs/mumbai`;

export const getMultiGiveawayFiles = (): Array<number> => {
  if (fs.existsSync(multigiveawayPath)) {
    return fs
      .readdirSync(multigiveawayPath)
      .filter((giveaway) => Number(giveaway) > 0)
      .map((giveaway) => parseInt(giveaway, 10))
      .sort((a, b) => a - b);
  } else {
    return [];
  }
};

export const getProofsFileData = (
  giveaway: number
): Array<{
  to: string;
  erc1155: Array<{
    ids: Array<string>;
    values: Array<number>;
    contractAddress: string;
  }>;
  erc721: Array<{
    ids: Array<string>;
    contractAddress: string;
  }>;
  erc20: {
    amounts: Array<string>;
    contractAddresses: Array<string>;
  };
  salt: string;
}> | null => {
  const file = `${multigiveawayPath}/${giveaway}/proofs`;
  if (!fs.existsSync(file)) {
    return null;
  }
  const buffer = fs.readFileSync(file);
  return JSON.parse(buffer.toString());
};

export const getClaimTxs = async (
  rootHash: string
): Promise<
  Array<{id: string; txHash: string; wallet: {id: string}; claim: {id: string}}>
> => {
  const graphUrl = isPolygon
    ? 'https://api.thegraph.com/subgraphs/name/sandboxthegraph/the-sandbox-claims-polygon'
    : 'https://api.thegraph.com/subgraphs/name/sandboxthegraph/the-sandbox-claims-mumbai';

  if (!graphUrl) throw new Error(`Giveaway claims graph url is missing`);

  const query = `
        query($rootHash: String! $first: Int! $lastId: ID!) {
          claimTxes(first: $first where: { claim_: { id: $rootHash } id_gt: $lastId }) {
            id
            txHash
            wallet {
              id
            }
            claim {
              id
            }
          }
        }`;
  const graph = new TheGraph(graphUrl);
  const result = await graph.query<{
    id: string;
    txHash: string;
    wallet: {id: string};
    claim: {id: string};
  }>(query, 'claimTxes', {rootHash});
  return result;
};
