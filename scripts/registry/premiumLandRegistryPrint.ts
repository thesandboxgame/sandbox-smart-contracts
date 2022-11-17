import {BigNumber} from 'ethers';
import {ethers, getNamedAccounts} from 'hardhat';
import {printTileWithCoord, tileWithCoordToJS} from '../../test/map/fixtures';

async function main() {
  const {mapDesigner} = await getNamedAccounts();
  const contract = await ethers.getContract('PremiumLandRegistry', mapDesigner);
  const l = BigNumber.from(await contract.length()).toNumber();
  console.log('current Premium lands tile quantity', l);
  console.log(
    'current Premium lands quantity',
    BigNumber.from(await contract.getLandCount()).toString()
  );
  const coords = [];
  for (let i = 0; i < l; i++) {
    coords.push(tileWithCoordToJS(await contract['at(uint256)'](i)));
  }
  coords.sort((a, b) => (a.y.lt(b.y) && a.x.lt(b.x) ? -1 : 1));
  for (const c of coords) {
    // The map in thw web site starts from the bottom => reverse y.
    printTileWithCoord({...c, tile: c.tile.reverse()});
  }
}

main().catch((err) => console.error(err));
