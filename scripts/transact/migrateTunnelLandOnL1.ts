/**
 * How to use:
 *  - yarn execute <NETWORK> ./scripts/transact/migrateTunnelLandOnL1.ts
 */
import fs from 'fs-extra';
import {ethers, getNamedAccounts} from 'hardhat';

const tokensSnapshotL1 = JSON.parse(
  fs.readFileSync('./tunnel_mainnet.json').toString()
);

const maxIdInTransaction = 20;

void (async () => {
  const {deployer} = await getNamedAccounts();
  const landTunnelMigration = await ethers.getContract('LandTunnelMigration');
  const tokenIdsOnL1 = [];
  for (let i = 0; i < tokensSnapshotL1.length; i++) {
    tokenIdsOnL1.push(parseInt(tokensSnapshotL1[i].id));
  }
  let index = 0;
  const tokenIdsOnL1Length = tokenIdsOnL1.length;
  const numberOfCalls = Math.ceil(tokenIdsOnL1Length / maxIdInTransaction);
  const landTunnelMigrationAsAdmin = await landTunnelMigration.connect(
    ethers.provider.getSigner(deployer)
  );
  for (let i = 0; i < numberOfCalls; i++) {
    const argument = tokenIdsOnL1.slice(index, index + maxIdInTransaction);
    await landTunnelMigrationAsAdmin.migrateToTunnel(argument);
    index = index + maxIdInTransaction;
  }
})();
