/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * How to use:
 *  - yarn execute <NETWORK> ./scripts/landTunnelMigration/migrateAndWithdrawTunnelLandOnL2.ts <ADDRESS OF POLYGON LAND TUNNEL> <BLOCKNUMBER OF POLYGON LAND TUNNEL CREATION>
 */
import {Contract, EventFilter} from 'ethers';
import {AbiCoder} from 'ethers/lib/utils';
import fs from 'fs-extra';
import 'dotenv/config';
import {ethers} from 'hardhat';

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

const args = process.argv.slice(2);
const landTunnel = args[0];
const startBlock = parseInt(args[1]);

const messageSentSignature = ['event MessageSent(bytes message)'];

const abiCoder = new AbiCoder();
const GRID_SIZE = 408;

void (async () => {
  const LandTunnelTokenConfig = JSON.parse(
    fs.readFileSync('./tunnel_land_token_config.json').toString()
  );

  const commonIds = LandTunnelTokenConfig.commonIds;
  const endBlock = await ethers.provider.getBlockNumber();
  const ownerWithQuadSizeAndCoordinatesArr: Array<ownerWithLandID> = [];

  const PolygonLandTunnelMigration = await ethers.getContract(
    'PolygonLandTunnelMigration'
  );

  const PolygonLandTunnelMigrationAsRelayer = PolygonLandTunnelMigration.connect(
    signer
  );

  console.log('Fetching owner of LandIds');

  // fetch the intended owners on L1 for common Lands on both L1 and L2
  for (let i = 0; i < commonIds.length; i++) {
    await queryAndSaveWithdrawEventArguments(
      ethers.utils.hexlify(commonIds[i])
    );
  }

  const tnx = await PolygonLandTunnelMigrationAsRelayer.approveNewLandTunnel();
  await tnx.wait();

  // function call to migrate and withdraw Land on L2
  for (let i = 0; i < ownerWithQuadSizeAndCoordinatesArr.length; i++) {
    await migrateLandToTunnelWithWithdraw(
      ownerWithQuadSizeAndCoordinatesArr[i]
    );
  }

  // function to get the owner of Land @tokenId
  async function queryAndSaveWithdrawEventArguments(tokenId: string) {
    const Land = await ethers.getContract('PolygonLand');
    const singleTransferEvents = await queryEvents(
      Land,
      Land.filters.Transfer(null, landTunnel, tokenId),
      startBlock,
      endBlock
    );

    const transactionHash =
      singleTransferEvents[singleTransferEvents.length - 1].transactionHash;

    const transaction = await ethers.provider.getTransactionReceipt(
      transactionHash
    );

    const ifaceMessageSent = new ethers.utils.Interface(messageSentSignature);

    const length = transaction.logs.length;
    const messageSentLog = ifaceMessageSent.parseLog(
      transaction.logs[length - 2]
    );

    // decoding the MessageSent log arguments which has the information of quads sent to the tunnel on L2.
    const decodedArgs = abiCoder.decode(
      ['address', 'uint256[]', 'uint256[]', 'uint256[]', 'bytes'],
      messageSentLog.args[0]
    );

    if (decodedArgs[1].length == 1) {
      // case when the single quad is sent to the tunnel.
      // we check if quad is already added if not we add it to the ownerWithQuadSizeAndCoordinatesArr array
      if (
        !checkQuadAdded(
          decodedArgs[0],
          decodedArgs[1][0],
          decodedArgs[2][0],
          decodedArgs[3][0]
        )
      ) {
        ownerWithQuadSizeAndCoordinatesArr.push({
          owner: decodedArgs[0],
          sizes: [parseInt(decodedArgs[1][0])],
          x: [parseInt(decodedArgs[2][0])],
          y: [parseInt(decodedArgs[3][0])],
        });
      }
    } else {
      // case when more than one quad is sent to the tunnel on L2
      const {x, y} = getLandCoordinates(parseInt(tokenId));
      for (let i = 0; i < decodedArgs[1].length; i++) {
        if (decodedArgs[1][i] == 1) {
          // case for 1x1 land transfer
          if (x == decodedArgs[2][i] && y == decodedArgs[3][i]) {
            ownerWithQuadSizeAndCoordinatesArr.push({
              owner: decodedArgs[0],
              sizes: [1],
              x: [x],
              y: [y],
            });
          }
        } else {
          // case for a quad transfer
          // we check if quad is already added if not we add it to the ownerWithQuadSizeAndCoordinatesArr array
          if (
            decodedArgs[2][i] <= x &&
            x < decodedArgs[2][i] + decodedArgs[1][i] &&
            decodedArgs[3][i] <= y &&
            y < decodedArgs[3][i] + decodedArgs[1][i] &&
            !checkQuadAdded(
              decodedArgs[0],
              decodedArgs[1][i],
              decodedArgs[2][i],
              decodedArgs[3][i]
            )
          ) {
            ownerWithQuadSizeAndCoordinatesArr.push({
              owner: decodedArgs[0],
              sizes: [parseInt(decodedArgs[1][i])],
              x: [parseInt(decodedArgs[2][i])],
              y: [parseInt(decodedArgs[3][i])],
            });
          }
        }
      }
    }
  }

  // function to check if a Quad is added to the ownerWithQuadSizeAndCoordinatesArr Array
  function checkQuadAdded(owner: string, size: number, x: number, y: number) {
    for (let i = 0; i < ownerWithQuadSizeAndCoordinatesArr.length; i++) {
      if (
        ownerWithQuadSizeAndCoordinatesArr[i].owner == owner &&
        ownerWithQuadSizeAndCoordinatesArr[i].sizes[0] == size &&
        ownerWithQuadSizeAndCoordinatesArr[i].x[0] == x &&
        ownerWithQuadSizeAndCoordinatesArr[i].y[0] == y
      )
        return true;
    }
    return false;
  }

  // function to get the land's co-ordinates from land id
  function getLandCoordinates(tokenId: number) {
    const x = Math.floor(tokenId % GRID_SIZE);
    const y = Math.floor(Math.floor(tokenId / GRID_SIZE));
    return {x, y};
  }

  // function to query event from startBlock to endBlock
  async function queryEvents(
    contract: Contract,
    filter: EventFilter,
    startBlock: number,
    endBlock: number
  ) {
    let consecutiveSuccess = 0;
    const successes: Record<number, boolean> = {};
    const failures: Record<number, boolean> = {};
    const events = [];
    let blockRange = 2560000000;
    let fromBlock = startBlock;
    let toBlock = Math.min(fromBlock + blockRange, endBlock);
    while (fromBlock <= endBlock) {
      try {
        const moreEvents = await contract.queryFilter(
          filter,
          fromBlock,
          toBlock
        );

        console.log({fromBlock, toBlock, numEvents: moreEvents.length});
        successes[blockRange] = true;
        consecutiveSuccess++;
        if (consecutiveSuccess > 6) {
          const newBlockRange = blockRange * 2;
          if (!failures[newBlockRange] || successes[newBlockRange]) {
            blockRange = newBlockRange;
            console.log({blockRange});
          }
        }

        fromBlock = toBlock + 1;
        toBlock = Math.min(fromBlock + blockRange, endBlock);
        events.push(...moreEvents);
      } catch (e) {
        failures[blockRange] = true;
        consecutiveSuccess = 0;
        blockRange /= 2;
        toBlock = Math.min(fromBlock + blockRange, endBlock);

        console.log({fromBlock, toBlock, numEvents: 'ERROR'});
        console.error(e);
      }
    }
    return events;
  }

  interface ownerWithLandID {
    owner: string;
    sizes: Array<number>;
    x: Array<number>;
    y: Array<number>;
  }

  // function to migrate and withdraw common Lands through Land migration contract on L2
  async function migrateLandToTunnelWithWithdraw(
    ownerWithLandIds: ownerWithLandID
  ) {
    await PolygonLandTunnelMigrationAsRelayer.migrateToTunnelWithWithdraw(
      ownerWithLandIds
    );
  }
})();
