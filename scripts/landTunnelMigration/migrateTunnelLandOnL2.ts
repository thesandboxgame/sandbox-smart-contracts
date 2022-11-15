/**
 * How to use:
 *  - yarn execute <NETWORK> ./scripts/landTunnelMigration/migrateTunnelLandOnL2.ts
 */
import fs from 'fs-extra';
import {
  DefenderRelayProvider,
  DefenderRelaySigner,
} from 'defender-relay-client/lib/ethers';
const credentials = {
  apiKey: process.env.MUMBAI_RELAYER_API_KEY || '',
  apiSecret: process.env.MUMBAI_RELAYER_API_SECRET || '',
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

const uniqueLandsOnTunnelL2 = LandTunnelTokenConfig.remainingTokenOnL2;
const quads3x3 = LandTunnelTokenConfig.quads3x3OnLayer2;
const quads6x6 = LandTunnelTokenConfig.quads6x6OnLayer2;
const quads12x12 = LandTunnelTokenConfig.quads12x12OnLayer2;
const quads24x24 = LandTunnelTokenConfig.quads24x24OnLayer2;

const maxIdsInTransaction = 990;
const max3x3QuadsInTransaction = 108;
const max6x6QuadsInTransaction = 24;
const max12x12QuadsInTransaction = 6;
const max24x24QuadsInTransaction = 2;

void (async () => {
  const PolygonLandTunnelMigration = await ethers.getContract(
    'PolygonLandTunnelMigration'
  );
  const polygonLandTunnelMigrationAsRelayer = PolygonLandTunnelMigration.connect(
    signer
  );

  if (uniqueLandsOnTunnelL2.length > 0) {
    let indexOfIds = 0;

    const uniqueLandsOnL2Length = uniqueLandsOnTunnelL2.length;
    const numberOfCallsForIds =
      uniqueLandsOnL2Length / maxIdsInTransaction == 0
        ? uniqueLandsOnL2Length / maxIdsInTransaction
        : Math.ceil(uniqueLandsOnL2Length / maxIdsInTransaction);
    for (let i = 0; i < numberOfCallsForIds; i++) {
      const argument = uniqueLandsOnTunnelL2.slice(
        indexOfIds,
        indexOfIds + maxIdsInTransaction
      );
      indexOfIds = indexOfIds + maxIdsInTransaction;
      await migrateLandToTunnel(argument);
    }
  }

  if (quads3x3.length > 0) {
    let indexOf3x3Quads = 0;
    const unique3x3QuadsOnL2Length = quads3x3.length;
    const numberOfCalls =
      unique3x3QuadsOnL2Length / max3x3QuadsInTransaction == 0
        ? unique3x3QuadsOnL2Length / max3x3QuadsInTransaction
        : Math.ceil(unique3x3QuadsOnL2Length / max3x3QuadsInTransaction);
    for (let i = 0; i < numberOfCalls; i++) {
      const argument = quads3x3.slice(
        indexOf3x3Quads,
        indexOf3x3Quads + max3x3QuadsInTransaction
      );
      indexOf3x3Quads = indexOf3x3Quads + max3x3QuadsInTransaction;
      await migrateQuadToTunnel(argument, 3);
    }
  }

  if (quads6x6.length > 0) {
    let indexOf6x6Quads = 0;
    const unique6x6QuadsOnL2Length = quads6x6.length;
    const numberOfCalls =
      unique6x6QuadsOnL2Length / max6x6QuadsInTransaction == 0
        ? unique6x6QuadsOnL2Length / max6x6QuadsInTransaction
        : Math.ceil(unique6x6QuadsOnL2Length / max6x6QuadsInTransaction);
    for (let i = 0; i < numberOfCalls; i++) {
      const argument = quads6x6.slice(
        indexOf6x6Quads,
        indexOf6x6Quads + max6x6QuadsInTransaction
      );
      indexOf6x6Quads = indexOf6x6Quads + max6x6QuadsInTransaction;
      await migrateQuadToTunnel(argument, 6);
    }
  }

  if (quads12x12.length > 0) {
    let indexOf12x12Quads = 0;
    const unique12x12QuadsOnL2Length = quads12x12.length;
    const numberOfCalls =
      unique12x12QuadsOnL2Length / max12x12QuadsInTransaction == 0
        ? unique12x12QuadsOnL2Length / max12x12QuadsInTransaction
        : Math.ceil(unique12x12QuadsOnL2Length / max12x12QuadsInTransaction);
    for (let i = 0; i < numberOfCalls; i++) {
      const argument = quads12x12.slice(
        indexOf12x12Quads,
        indexOf12x12Quads + max12x12QuadsInTransaction
      );
      indexOf12x12Quads = indexOf12x12Quads + max12x12QuadsInTransaction;
      await migrateQuadToTunnel(argument, 12);
    }
  }

  if (quads24x24.length > 0) {
    let indexOf24x24Quads = 0;
    const unique24x24QuadsOnL2Length = quads24x24.length;
    const numberOfCalls =
      unique24x24QuadsOnL2Length / max24x24QuadsInTransaction == 0
        ? unique24x24QuadsOnL2Length / max24x24QuadsInTransaction
        : Math.ceil(unique24x24QuadsOnL2Length / max24x24QuadsInTransaction);
    for (let i = 0; i < numberOfCalls; i++) {
      const argument = quads24x24.slice(
        indexOf24x24Quads,
        indexOf24x24Quads + max24x24QuadsInTransaction
      );
      indexOf24x24Quads = indexOf24x24Quads + max24x24QuadsInTransaction;
      await migrateQuadToTunnel(argument, 24);
    }
  }

  // function to migrate Lands through Land migration contract on L2
  async function migrateLandToTunnel(arr: Array<number>) {
    console.log(
      `Migrating ${arr.length} 1x1 land from old land tunnel to new land tunnel`
    );
    await polygonLandTunnelMigrationAsRelayer.migrateLandsToTunnel(arr);
  }

  // function to migrate Quads through Land migration contract on L2
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
    await polygonLandTunnelMigrationAsRelayer.migrateQuadsToTunnel(sizes, x, y);
  }
})();
