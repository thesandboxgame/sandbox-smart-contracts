import {ethers} from 'hardhat';
import {BigNumber} from 'ethers';
import {Event} from '@ethersproject/contracts';
import {getArgParser} from '../utils/utils';
import {tileWithCoordToJS} from '../../test/map/fixtures';
import {Box, Point, QuadTreeWithCounter} from './quadTree';

function parseArgs() {
  const parser = getArgParser({
    description: `RUN WITH: yarn execute mumbai ${process.argv[0]}`,
  });
  parser.addArgument(['token'], {help: 'token id'});
  const args = parser.parseArgs();
  return BigNumber.from(args.token);
}

async function main() {
  const nodeUrl = process.env.ETH_NODE_URI_POLYGON;
  if (!nodeUrl) {
    throw new Error(`Set the env var ETH_NODE_URI_POLYGON`);
  }
  const pk = process.env.USER_PK;
  if (!pk) {
    throw new Error(`Set the env var USER_PK`);
  }
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.ETH_NODE_URI_POLYGON
  );
  const wallet = new ethers.Wallet(pk, provider);
  const estateId = parseArgs();

  const estateContact = await ethers.getContract('PolygonEstate', wallet);
  const tileCant = await estateContact.getLandLength(estateId);
  const quadMultiple = 24 * 2 * 2 * 2 * 2 * 2;
  const quadTree = new QuadTreeWithCounter(
    new Box(0, 0, quadMultiple, quadMultiple)
  );
  for (let i = 0; i < tileCant; i += 10) {
    const tileArray = await estateContact.getLandAt(
      estateId,
      i,
      Math.min(i + 10, tileCant)
    );
    tileArray
      .map(tileWithCoordToJS)
      .forEach((t: {tile: boolean[][]; x: BigNumber; y: BigNumber}) => {
        for (let x = 0; x < 24; x++)
          for (let y = 0; y < 24; y++)
            if (t.tile[y][x])
              quadTree.insert(
                new Point(t.x.toNumber() + x, t.y.toNumber() + y)
              );
      });
  }
  const landToRemove = quadTree
    .findFullQuads()
    .map((q) => ({x: q.x, y: q.y, size: Math.sqrt(q.h * q.w)}));
  landToRemove.sort((a, b) => a.size - b.size);
  console.log(
    'Calling update for token',
    estateId.toString(),
    estateId.toHexString(),
    'everything: ',
    landToRemove
  );

  const tx = await estateContact.update(
    estateId,
    [[], [], []],
    [],
    landToRemove
  );
  const receipt = await tx.wait();
  const events = receipt.events.filter(
    (v: Event) => v.event === 'EstateTokenBurned'
  );
  const ret = BigNumber.from(events[0].args['estateId']);
  console.log(
    'Estate burned, estateId',
    ret.toString(),
    ret.toHexString(),
    'user',
    events[0].args['from'],
    'gas used',
    BigNumber.from(receipt.gasUsed).toString()
  );
}

if (require.main === module) {
  main().catch((err) => console.error(err.message));
}
