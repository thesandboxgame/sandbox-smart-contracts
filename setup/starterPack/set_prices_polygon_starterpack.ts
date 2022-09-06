/**
 * How to use:
 *  - yarn execute <NETWORK> ./setup/starterPack/set_prices_polygon_starterpack.ts
 */

import hre from 'hardhat';
import {DeployFunction} from 'hardhat-deploy/types';
import {prices} from '../../data/starterPackPrices';

const func: DeployFunction = async function () {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read, catchUnknownSigner} = deployments;
  const {starterPackAdmin} = await getNamedAccounts();

  // Get PolygonStarterPack
  const starterPackContract = await deployments.getOrNull('PolygonStarterPack');
  if (!starterPackContract) {
    console.log(`No ${starterPackContract} deployment`);
    return;
  }

  // Check admin
  const STARTERPACK_ROLE = await read('PolygonStarterPack', 'STARTERPACK_ROLE');

  const isAdmin = await read(
    'PolygonStarterPack',
    'hasRole',
    STARTERPACK_ROLE,
    starterPackAdmin
  ).catch(() => null);

  if (!isAdmin) {
    console.log(`No starterPackAdmin`);
    return;
  }

  // Set new prices
  await catchUnknownSigner(
    execute(
      'PolygonStarterPack',
      {from: starterPackAdmin, log: true},
      'setPrices',
      prices.catalystIds,
      prices.catalystPrices,
      prices.gemIds,
      prices.gemPrices
    )
  );

  console.log(`New prices have been set`);

  const readPrices = await read(
    'PolygonStarterPack',
    'getPrices',
    prices.catalystIds,
    prices.gemIds
  );

  // View prices
  console.log(`catalystPrices before price change: ${readPrices[0]}`);
  console.log(`catalystPrices after price change: ${readPrices[1]}`);
  console.log(`gemPrices before price change: ${readPrices[2]}`);
  console.log(`gemPrices after price change: ${readPrices[3]}`);

  console.log('Note that these new prices will NOT take effect for 1 HOUR');
  console.log(
    'You will need to call setSANDEnabled to enable purchases in SAND'
  );
};
export default func;

if (require.main === module) {
  func(hre).catch((err) => console.error(err));
}
