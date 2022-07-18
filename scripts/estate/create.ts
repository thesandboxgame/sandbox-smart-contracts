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

  parser.addArgument(['-a', '--add'], {
    action: 'append',
    help: 'add quad',
    type: quad,
  });

  const args = parser.parseArgs();
  const ifNullEmpty = (x: unknown[]) => (x === null ? [] : x);
  args.add = ifNullEmpty(args.add);
  return [
    args.add.map((x: {size: BigNumber}) => x.size),
    args.add.map((x: {x: BigNumber}) => x.x),
    args.add.map((x: {y: BigNumber}) => x.y),
  ];
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
  console.log('Wallet address', wallet.address);

  const landToAdd = parseArgs();

  console.log(
    'Calling create',
    landToAdd.map((x) => x.toString())
  );
  const estateContact = await ethers.getContract('PolygonEstate', wallet);
  const tx = await estateContact.create(landToAdd);
  const receipt = await tx.wait();
  const events = receipt.events.filter(
    (v: Event) => v.event === 'EstateTokenCreated'
  );
  const estateId = BigNumber.from(events[0].args['estateId']);
  console.log(
    'Estate created, estateId',
    estateId.toString(),
    estateId.toHexString(),
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
