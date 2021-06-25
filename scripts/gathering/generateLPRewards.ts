import fs from 'fs';
import {TheGraph} from '../utils/thegraph';
import {getBlockArgs} from '../utils/utils';

const blockNumber = getBlockArgs(0);

interface Staker {
  id: string;
}

const theGraph = new TheGraph(
  'https://api.thegraph.com/subgraphs/name/nicovrg/liquidity-mining'
);

const queryString = `
  query($blockNumber: Int! $first: Int! $lastId: ID!) {
    stakers(first: $first where: {id_gt: $lastId} block: {number: $blockNumber}) {
      id
    }
  }
`;

async function main() {
  const addList: Array<string> = [];

  const stakers: Array<Staker> = await theGraph.query(queryString, 'stakers', {
    blockNumber,
  });

  stakers.map((staker) => {
    addList.push(staker.id);
  });

  console.log({numStakers: stakers.length});
  fs.writeFileSync('result.json', JSON.stringify(addList, null, '  '));
}

main();
