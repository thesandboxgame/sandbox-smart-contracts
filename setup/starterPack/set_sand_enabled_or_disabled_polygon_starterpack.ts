/**
 * How to use:
 *  - yarn execute <NETWORK> ./setup/starterPack/set_sand_enabled_or_disabled_polygon_starterpack.ts <bool>
 *
 * where <bool> is `true`, corresponding to setSANDEnabled(true), or `false`, corresponding to setSANDEnabled(false)
 *
 */

import hre from 'hardhat';
import {DeployFunction} from 'hardhat-deploy/types';

const bool = process.argv[2];

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

  // Enable or disable SAND purchases
  await catchUnknownSigner(
    execute(
      'PolygonStarterPack',
      {from: starterPackAdmin, log: true},
      'setSANDEnabled',
      bool
    )
  );

  console.log(`SAND purchasing has been set to ${bool}`);
};
export default func;

if (require.main === module) {
  func(hre).catch((err) => console.error(err));
}
