import fs from 'fs-extra';
import {ethers} from 'hardhat';

const tokensSnapshotL1 = JSON.parse(
  fs.readFileSync('./tunnel_mainnet.json').toString()
);

const maxIdInTransaction = 20;

void (async () => {
  const landTunnelMigration = await ethers.getContract('LandTunnelMigration');
  const tokenIdsOnL1 = [];
  for (let i = 0; i < tokensSnapshotL1.length; i++) {
    tokenIdsOnL1.push(parseInt(tokensSnapshotL1[i].id));
  }
  let index = 0;
  const tokenIdsOnL1Length = tokenIdsOnL1.length;
  const numberOfCalls = Math.ceil(tokenIdsOnL1Length / maxIdInTransaction);

  for (let i = 0; i < numberOfCalls; i++) {
    const argument = tokenIdsOnL1.slice(index, index + maxIdInTransaction);
    await landTunnelMigration.migrateToTunnel(argument);
    index = index + maxIdInTransaction;
  }
})();
