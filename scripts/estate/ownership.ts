import {ethers} from 'hardhat';
import {AddressZero} from '@ethersproject/constants';
import {landToSteal} from './landToSteal';

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

  const landContract = await ethers.getContract('PolygonLand', wallet);
  for (const land of landToSteal) {
    const l = parseInt(land);
    const x = l % 408;
    const y = Math.floor(l / 408);
    const landId = x + y * 408;
    let owner = AddressZero;
    try {
      owner = await landContract.ownerOf(landId);
      // eslint-disable-next-line no-empty
    } catch {}
    console.log('x', x, 'y', y, 'landId', landId, 'owner', owner);
  }
}

if (require.main === module) {
  main().catch((err) => console.error(err.message));
}
