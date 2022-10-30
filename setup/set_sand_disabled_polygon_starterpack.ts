/**
 * How to use:
 *  - yarn execute <NETWORK> ./setup/set_sand_disabled_polygon_starterpack.ts
 */

import hre from 'hardhat';
import {DeployFunction} from 'hardhat-deploy/types';

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
      'setSANDEnabled',
      false
    )
  );

  console.log(`SAND purchasing has been DISABLED`);
};
export default func;

if (require.main === module) {
  func(hre).catch((err) => console.error(err));
}
