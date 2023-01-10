/**
 * How to use:
 *  - yarn execute <NETWORK> ./scripts/transact/migrateTunnelLandOnL1.ts
 */
import fs from 'fs-extra';
import {ethers, getNamedAccounts} from 'hardhat';

const tokensSnapshotL1 = JSON.parse(
  fs.readFileSync('./tunnel_mainnet_lands.json').toString()
);

const quadsOnLayer1 = JSON.parse(
  fs.readFileSync('./tunnel_mainnet_quads.json').toString()
);

const quads3x3 = quadsOnLayer1.quads3x3OnLayer1;
const quads6x6 = quadsOnLayer1.quads6x6OnLayer1;
const quads12x12 = quadsOnLayer1.quads12x12OnLayer1;
const quads24x24 = quadsOnLayer1.quads24x24OnLayer1;

const maxIdInTransaction = 20;
const max3x3QuadsInTransaction = 20;
const max6x6QuadsInTransaction = 20;
const max12x12QuadsInTransaction = 20;
const max24x24QuadsInTransaction = 20;

void (async () => {
  const {deployer} = await getNamedAccounts();
  const landTunnelMigration = await ethers.getContract('LandTunnelMigration');
  const landTunnelMigrationAsAdmin = await landTunnelMigration.connect(
    ethers.provider.getSigner(deployer)
  );
  let indexIds = 0;
  const tokenIdsOnL1Length = tokensSnapshotL1.length;
  const numberOfCallsForIds = Math.ceil(
    tokenIdsOnL1Length / maxIdInTransaction
  );

  for (let i = 0; i < numberOfCallsForIds; i++) {
    const argument = tokensSnapshotL1.slice(
      indexIds,
      indexIds + maxIdInTransaction
    );
    console.log({argument});
    await landTunnelMigrationAsAdmin.migrateLandsToTunnel(argument);
    indexIds = indexIds + maxIdInTransaction;
  }

  if (quads3x3.length > 0) {
    let index3x3Quads = 0;
    const quads3x3OnLayer1Length = quads3x3.length;
    const numberOfCallsForQuads = Math.ceil(
      quads3x3OnLayer1Length / max3x3QuadsInTransaction
    );
    for (let i = 0; i < numberOfCallsForQuads; i++) {
      const argument = quads3x3.slice(
        index3x3Quads,
        index3x3Quads + max3x3QuadsInTransaction
      );
      const x: Array<number> = [];
      const y: Array<number> = [];
      const sizes: Array<number> = [];
      for (let i = 0; i < argument.length; i++) {
        x.push(argument[i].x);
        y.push(argument[i].y);
        sizes.push(argument[i].size);
      }
      await landTunnelMigrationAsAdmin.migrateQuadsToTunnel(sizes, x, y);
      index3x3Quads = index3x3Quads + max3x3QuadsInTransaction;
    }
  }

  if (quads6x6.length > 0) {
    let index6x6Quads = 0;
    const quads6x6OnLayer1Length = quads6x6.length;
    const numberOfCallsForQuads = Math.ceil(
      quads6x6OnLayer1Length / max6x6QuadsInTransaction
    );
    for (let i = 0; i < numberOfCallsForQuads; i++) {
      const argument = quads6x6.slice(
        index6x6Quads,
        index6x6Quads + max6x6QuadsInTransaction
      );
      const x: Array<number> = [];
      const y: Array<number> = [];
      const sizes: Array<number> = [];
      for (let i = 0; i < argument.length; i++) {
        x.push(argument[i].x);
        y.push(argument[i].y);
        sizes.push(argument[i].size);
      }
      await landTunnelMigrationAsAdmin.migrateQuadsToTunnel(sizes, x, y);
      index6x6Quads = index6x6Quads + max6x6QuadsInTransaction;
    }
  }

  if (quads12x12.length > 0) {
    let index12x12Quads = 0;
    const quads12x12OnLayer1Length = quads12x12.length;
    const numberOfCallsForQuads = Math.ceil(
      quads12x12OnLayer1Length / max12x12QuadsInTransaction
    );
    for (let i = 0; i < numberOfCallsForQuads; i++) {
      const argument = quads12x12.slice(
        index12x12Quads,
        index12x12Quads + max12x12QuadsInTransaction
      );
      const x: Array<number> = [];
      const y: Array<number> = [];
      const sizes: Array<number> = [];
      for (let i = 0; i < argument.length; i++) {
        x.push(argument[i].x);
        y.push(argument[i].y);
        sizes.push(argument[i].size);
      }
      await landTunnelMigrationAsAdmin.migrateQuadsToTunnel(sizes, x, y);
      index12x12Quads = index12x12Quads + max12x12QuadsInTransaction;
    }
  }

  if (quads24x24.length > 0) {
    let index24x24Quads = 0;
    const quads24x24OnLayer1Length = quads24x24.length;
    const numberOfCallsForQuads = Math.ceil(
      quads24x24OnLayer1Length / max24x24QuadsInTransaction
    );
    for (let i = 0; i < numberOfCallsForQuads; i++) {
      const argument = quads24x24.slice(
        index24x24Quads,
        index24x24Quads + max24x24QuadsInTransaction
      );
      const x: Array<number> = [];
      const y: Array<number> = [];
      const sizes: Array<number> = [];
      for (let i = 0; i < argument.length; i++) {
        x.push(argument[i].x);
        y.push(argument[i].y);
        sizes.push(argument[i].size);
      }
      await landTunnelMigrationAsAdmin.migrateQuadsToTunnel(sizes, x, y);
      index24x24Quads = index24x24Quads + max24x24QuadsInTransaction;
    }
  }
})();
