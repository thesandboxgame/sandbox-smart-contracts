import {Event} from 'ethers';
import BN from 'bn.js';
import fs from 'fs-extra';
import {ethers} from 'hardhat';
import hre from 'hardhat';

async function queryEvents(
  filterFunc: (startBlock: number, endBlock: number) => Promise<Event[]>,
  startBlock: number,
  endBlock?: number
) {
  if (!endBlock) {
    endBlock = await ethers.provider.getBlockNumber();
  }
  let consecutiveSuccess = 0;
  const successes: Record<number, boolean> = {};
  const failures: Record<number, boolean> = {};
  const events = [];
  let blockRange = 100000;
  let fromBlock = startBlock;
  let toBlock = Math.min(fromBlock + blockRange, endBlock);
  while (fromBlock <= endBlock) {
    try {
      const moreEvents = await filterFunc(fromBlock, toBlock);
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
      console.log({blockRange});
      console.error(e);
    }
  }
  return events;
}

const gridSize = new BN(408);

function tokenIdToMapCoords(
  topCornerId: BN
): {coordinateX: string; coordinateY: string} {
  const id = new BN(topCornerId.toString());
  const coordinateX = id
    .mod(gridSize) // x = id % 408
    .toString(10);
  const coordinateY = id
    .div(gridSize) // y = id / 408
    .toString(10);
  return {coordinateX, coordinateY};
}

(async () => {
  const {deployments} = hre;
  const allDeployedContracts = await deployments.all();
  let minBlockNumber;
  const presaleContractNames = Object.keys(
    allDeployedContracts
  ).filter((contract) => contract.includes('LandPreSale'));

  for (const presaleContractName of presaleContractNames) {
    const contract = allDeployedContracts[presaleContractName];
    const creationBlock =
      (contract && contract.receipt && contract.receipt.blockNumber) || 0;
    if (!minBlockNumber || creationBlock < minBlockNumber) {
      minBlockNumber = creationBlock;
    }
  }

  const startBlock = minBlockNumber || 0;
  const networkName = hre.network.name;
  const exportFilePath = `tmp/${networkName}-landOwners.json`;

  type Land = {
    coordinateX: string;
    coordinateY: string;
    size: BN;
    tokenId: string;
  };
  const landOwnersMap: {[owner: string]: Land[]} = {};

  const LandContract = await ethers.getContract('Land');

  for (const presaleContractName of presaleContractNames) {
    const presaleContract = await ethers.getContract(presaleContractName);
    if (!presaleContract)
      console.log(`No contract found for presale: ${presaleContractName}`);
    const landQuadPurchasedEvents = await queryEvents(
      presaleContract.queryFilter.bind(
        presaleContract,
        presaleContract.filters.LandQuadPurchased()
      ),
      startBlock
    );

    for (const event of landQuadPurchasedEvents) {
      const topCornerId: BN = event.args && event.args.topCornerId;
      const {coordinateX, coordinateY} = tokenIdToMapCoords(topCornerId);
      const size = new BN(event.args && event.args.size.toString());
      const currentLandOwner = await LandContract.callStatic.ownerOf(
        topCornerId
      );
      const land: Land = {
        coordinateX,
        coordinateY,
        size,
        tokenId: topCornerId.toString(),
      };
      if (currentLandOwner) {
        landOwnersMap[currentLandOwner] = landOwnersMap[currentLandOwner] || [];
        landOwnersMap[currentLandOwner].push(land);
      }
    }
  }

  // write output file
  console.log(`writing output to file ${exportFilePath}`);
  fs.outputJSONSync(exportFilePath, landOwnersMap);
})();
