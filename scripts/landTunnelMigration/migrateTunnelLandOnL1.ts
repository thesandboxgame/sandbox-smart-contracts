/**
 * How to use:
 *  - yarn execute <NETWORK> ./scripts/landTunnelMigration/migrateTunnelLandOnL1.ts
 */
import fs from 'fs-extra';
import {
  DefenderRelayProvider,
  DefenderRelaySigner,
} from 'defender-relay-client/lib/ethers';

const credentials = {
  apiKey: process.env.GOERLI_RELAYER_API_KEY || '',
  apiSecret: process.env.GOERLI_RELAYER_API_SECRET || '',
};
const provider = new DefenderRelayProvider(credentials);
const signer = new DefenderRelaySigner(credentials, provider, {speed: 'fast'});

import {ethers} from 'hardhat';

const LandTunnelTokenConfig = JSON.parse(
  fs.readFileSync('./tunnel_land_token_config.json').toString()
);

interface Quad {
  size: number;
  x: number;
  y: number;
}

const tokensSnapshotL1 = LandTunnelTokenConfig.tokenOnLayer1;
const quads3x3 = LandTunnelTokenConfig.quads3x3OnLayer1;
const quads6x6 = LandTunnelTokenConfig.quads6x6OnLayer1;
const quads12x12 = LandTunnelTokenConfig.quads12x12OnLayer1;
const quads24x24 = LandTunnelTokenConfig.quads24x24OnLayer1;

const maxIdInTransaction = 1490;
const max3x3QuadsInTransaction = 160;
const max6x6QuadsInTransaction = 40;
const max12x12QuadsInTransaction = 10;
const max24x24QuadsInTransaction = 3;

void (async () => {
  const landTunnelMigration = await ethers.getContract('LandTunnelMigration');
  const landTunnelMigrationAsRelayer = landTunnelMigration.connect(signer);

  if (tokensSnapshotL1.length > 0) {
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
      await migrateLandToTunnel(argument);
      indexIds = indexIds + maxIdInTransaction;
    }
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
      await migrateQuadToTunnel(argument, 3);
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
      await migrateQuadToTunnel(argument, 6);
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
      await migrateQuadToTunnel(argument, 12);
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
      await migrateQuadToTunnel(argument, 24);
      index24x24Quads = index24x24Quads + max24x24QuadsInTransaction;
    }
  }
  // function to migrate Lands through Land migration contract on L1
  async function migrateLandToTunnel(arr: Array<number>) {
    console.log(
      `Migrating ${arr.length} 1x1 land from old land tunnel to new land tunnel`
    );
    await landTunnelMigrationAsRelayer.migrateLandsToTunnel(arr);
  }

  // function to migrate Quads through Land migration contract on L1
  async function migrateQuadToTunnel(arr: Array<Quad>, size: number) {
    const x: Array<number> = [];
    const y: Array<number> = [];
    const sizes: Array<number> = [];
    for (let i = 0; i < arr.length; i++) {
      x.push(arr[i].x);
      y.push(arr[i].y);
      sizes.push(arr[i].size);
    }
    console.log(
      `Migrating ${arr.length} ${size}x${size} quad from old land tunnel to new land tunnel`
    );
    await landTunnelMigrationAsRelayer.migrateQuadsToTunnel(sizes, x, y);
  }
})();
