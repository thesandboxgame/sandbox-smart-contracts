/**
 * How to use:
 *  - yarn execute <NETWORK> ./scripts/transact/migrateTunnelLandOnL2.ts
 */
import fs from 'fs-extra';
import {ethers, getNamedAccounts} from 'hardhat';

const uniqueLandsOnTunnelL2 = JSON.parse(
  fs.readFileSync('./tunnel_polygon_unique_ids.json').toString()
);
const maxIdsInTransaction = 20;

void (async () => {
  const {deployer} = await getNamedAccounts();

  const PolygonLandTunnelMigration = await ethers.getContract(
    'PolygonLandTunnelMigration'
  );

  const PolygonLandTunnelMigrationAsAdmin = PolygonLandTunnelMigration.connect(
    ethers.provider.getSigner(deployer)
  );

  let index = 0;

  const uniqueLandsOnL2Length = uniqueLandsOnTunnelL2.length;
  const numberOfCalls =
    uniqueLandsOnL2Length / maxIdsInTransaction == 0
      ? uniqueLandsOnL2Length / maxIdsInTransaction
      : Math.ceil(uniqueLandsOnL2Length / maxIdsInTransaction);
  for (let i = 0; i < numberOfCalls; i++) {
    const argument = uniqueLandsOnTunnelL2.slice(
      index,
      index + maxIdsInTransaction
    );
    index = index + maxIdsInTransaction;
    await migrateLandToTunnel(argument);
  }

  // funtion to migrate Lands through Land migration contract on L2
  async function migrateLandToTunnel(arr: Array<number>) {
    await PolygonLandTunnelMigrationAsAdmin.migrateToTunnel(arr);
  }
})();
