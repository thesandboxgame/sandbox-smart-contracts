import {ethers} from 'hardhat';
import {BigNumber} from 'ethers';
import {Event} from '@ethersproject/contracts';
import {printTileWithCoord, tileWithCoordToJS} from '../../test/map/fixtures';
import {getArgParser} from '../utils/utils';

function parseArgs() {
  const parser = getArgParser({
    description: `RUN WITH: yarn execute mumbai ${process.argv[0]}`,
  });

  function quad(x: string) {
    const arr = x.split(',');
    if (arr.length != 3)
      throw TypeError('quad must have 3 components separated by comma');
    return {
      size: BigNumber.from(arr[0]),
      x: BigNumber.from(arr[1]),
      y: BigNumber.from(arr[2]),
    };
  }

  parser.addArgument(['token'], {help: 'token id'});

  parser.addArgument(['-a', '--add'], {
    action: 'append',
    help: 'add quad',
    type: quad,
  });
  parser.addArgument(['-r', '--remove'], {
    action: 'append',
    help: 'remove quad',
    type: quad,
  });
  parser.addArgument(['-u', '--unlink'], {
    action: 'append',
    help: 'unlink experience id',
    type: (x: string) => BigNumber.from(x),
  });
  const args = parser.parseArgs();
  const ifNullEmpty = <T>(x: T[]) => (x === null ? [] : x);
  args.add = ifNullEmpty(args.add);
  args.remove = ifNullEmpty(args.remove);
  return {
    estateId: BigNumber.from(args.token),
    landToAdd: [
      args.add.map((x: {size: BigNumber}) => x.size),
      args.add.map((x: {x: BigNumber}) => x.x),
      args.add.map((x: {y: BigNumber}) => x.y),
    ],
    expToUnlink: ifNullEmpty(args.unlink) as BigNumber[],
    landToRemove: [
      args.remove.map((x: {size: BigNumber}) => x.size),
      args.remove.map((x: {x: BigNumber}) => x.x),
      args.remove.map((x: {y: BigNumber}) => x.y),
    ],
  };
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
  const {estateId, landToAdd, expToUnlink, landToRemove} = parseArgs();

  console.log(
    'Calling update for token',
    estateId.toString(),
    estateId.toHexString()
  );
  console.log(
    'Adding',
    landToAdd.map((x) => x.toString())
  );
  console.log(
    'Unlinking',
    expToUnlink.map((x) => x.toString())
  );
  console.log(
    'Removing',
    landToRemove.map((x) => x.toString())
  );

  const estateContact = await ethers.getContract('PolygonEstate', wallet);
  const tx = await estateContact.update(
    estateId,
    landToAdd,
    expToUnlink,
    landToRemove
  );
  const receipt = await tx.wait();
  const events = receipt.events.filter(
    (v: Event) => v.event === 'EstateTokenUpdated'
  );
  const oldId = BigNumber.from(events[0].args['oldId']);
  const newId = BigNumber.from(events[0].args['newId']);
  console.log(
    'Estate updated, oldId',
    oldId.toString(),
    oldId.toHexString(),
    'newId',
    newId.toString(),
    newId.toHexString(),
    'user',
    events[0].args['user'],
    'gas used',
    BigNumber.from(receipt.gasUsed).toString()
  );
  const lands = events[0].args['lands'];
  for (const l of lands) {
    printTileWithCoord(tileWithCoordToJS(l));
  }
  console.log('gas used', BigNumber.from(receipt.gasUsed).toString());
}

if (require.main === module) {
  main().catch((err) => console.error(err.message));
}
