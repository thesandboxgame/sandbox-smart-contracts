import 'dotenv/config';
import fs from 'fs';
import {network} from 'hardhat';
import {MultiClaim} from '../../lib/merkleTreeHelper';
import {TheGraph} from '../utils/thegraph';

const multigiveawayBasePath = `${__dirname}/proofs/${network.name}`;

const outputBasePath = `${__dirname}/output/${network.name}`;

export const createtMultigiveawayBasePath = (): void => {
  if (!fs.existsSync(multigiveawayBasePath)) {
    fs.mkdirSync(multigiveawayBasePath, {recursive: true});
  }
};

export const getMultigiveawayBasePath = (): string => {
  return multigiveawayBasePath;
};

export const getOutputBasePath = (): string => {
  return outputBasePath;
};

export const getMultiGiveawayPaths = (): Array<number> => {
  if (fs.existsSync(multigiveawayBasePath)) {
    return fs
      .readdirSync(multigiveawayBasePath)
      .filter((giveaway) => Number(giveaway) > 0)
      .map((giveaway) => parseInt(giveaway, 10))
      .sort((a, b) => a - b);
  } else {
    throw new Error(`The directory does not exist: ${multigiveawayBasePath}`);
  }
};

export const getProofsFileData = (giveaway: number): Array<MultiClaim> => {
  const file = `${multigiveawayBasePath}/${giveaway}/proofs`;
  if (!fs.existsSync(file)) {
    throw new Error(`The file does not exist: ${file}`);
  }
  const buffer = fs.readFileSync(file);
  return JSON.parse(buffer.toString());
};

export const getClaimTxs = async (
  rootHash: string
): Promise<
  Array<{id: string; txHash: string; wallet: {id: string}; claim: {id: string}}>
> => {
  if (network.name === 'polygon' && !process.env.CLAIMS_GRAPH_URL_POLYGON) {
    throw new Error('CLAIMS_GRAPH_URL_POLYGON is not set');
  }
  if (network.name === 'mumbai' && !process.env.CLAIMS_GRAPH_URL_MUMBAI) {
    throw new Error('CLAIMS_GRAPH_URL_MUMBAI is not set');
  }

  const graphUrl =
    network.name === 'polygon'
      ? process.env.CLAIMS_GRAPH_URL_POLYGON
      : process.env.CLAIMS_GRAPH_URL_MUMBAI;

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
