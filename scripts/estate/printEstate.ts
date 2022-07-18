import {ethers} from 'hardhat';
import {getArgParser} from '../utils/utils';
import {BigNumber} from 'ethers';
import {
  printTileWithCoord,
  TileWithCoord,
  tileWithCoordToJS,
} from '../../test/map/fixtures';

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
  const signer = new ethers.Wallet(pk, provider);

  const parser = getArgParser({
    description: `RUN WITH: yarn execute mumbai ${process.argv[0]}`,
  });
  parser.addArgument(['token'], {help: 'token id'});
  const processArgs = parser.parseArgs();
  const estateId = BigNumber.from(processArgs.token);

  const estateContact = await ethers.getContract('PolygonEstate', signer);
  const tileCant = await estateContact.getLandLength(estateId);
  const map: TileWithCoord[] = [];
  for (let i = 0; i < tileCant; i += 10) {
    const tileArray = await estateContact.getLandAt(
      estateId,
      i,
      Math.min(i + 10, tileCant)
    );
    map.push(...tileArray.map(tileWithCoordToJS));
  }

  const landCant = BigNumber.from(await estateContact.getLandCount(estateId));
  console.log('Estate Id', estateId.toString(), estateId.toHexString());
  console.log('Owner', await estateContact.ownerOf(estateId));
  console.log('Token Uri', await estateContact.tokenURI(estateId));
  console.log('Land Cant', landCant.toString());
  map.sort((a, b) =>
    BigNumber.from(a.y).eq(b.y)
      ? BigNumber.from(a.x).sub(b.x).toNumber()
      : BigNumber.from(a.y).sub(b.y).toNumber()
  );
  for (const m of map) {
    printTileWithCoord(m);
  }
}

if (require.main === module) {
  main().catch((err) => console.error(err.message));
}
