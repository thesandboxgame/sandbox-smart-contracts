import { Event } from 'ethers';
import BN from 'bn.js';
import fs from 'fs-extra';
import { ethers } from 'hardhat';

const startBlock = 5530851; // This is the block number where the Land contract was deployed in rinkeby network
const networkName = 'rinkeby';
const exportFilePath = `tmp/${networkName}-landOwners.json`;


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
			console.log({ fromBlock, toBlock, numEvents: moreEvents.length });
			successes[blockRange] = true;
			consecutiveSuccess++;
			if (consecutiveSuccess > 6) {
				const newBlockRange = blockRange * 2;
				if (!failures[newBlockRange] || successes[newBlockRange]) {
					blockRange = newBlockRange;
					console.log({ blockRange });
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

			console.log({ fromBlock, toBlock, numEvents: 'ERROR' });
			console.log({ blockRange });
			console.error(e);
		}
	}
	return events;
}


const gridSize = new BN(408);

function tokenIdToMapCoords(topCornerId: BN): { coordinateX: string, coordinateY: string } {
	const id = new BN(topCornerId.toString());
	const coordinateX = id
		.mod(gridSize) // x = id % 408
		.toString(10);
	const coordinateY = id
		.div(gridSize) // y = id / 408
		.toString(10);
	return { coordinateX, coordinateY };
}

(async () => {
	const presaleContractNames = [
		'LandPreSale_1',
		'LandPreSale_10_27',
		'LandPreSale_10_28',
		'LandPreSale_10_29',
		'LandPreSale_10_30',
		'LandPreSale_11_31',
		'LandPreSale_12_32',
		'LandPreSale_2',
		'LandPreSale_3',
		'LandPreSale_3_4',
		'LandPreSale_3_5',
		'LandPreSale_3_6',
		'LandPreSale_3_7',
		'LandPreSale_3_8',
		'LandPreSale_3_9',
		'LandPreSale_4_1',
		'LandPreSale_4_2_11',
		'LandPreSale_4_2_12',
		'LandPreSale_4_2_13',
		'LandPreSale_4_2_14',
		'LandPreSale_5_16',
		'LandPreSale_5_17',
		'LandPreSale_5_18',
		'LandPreSale_5_19',
		'LandPreSale_6_18',
		'LandPreSale_6_bis_18',
		'LandPreSale_7_19',
		'LandPreSale_8_20',
		'LandPreSale_8_21',
		'LandPreSale_8_22',
		'LandPreSale_8_23',
		'LandPreSale_8_24',
		'LandPreSale_9_25',
		'LandPreSale_9_26'
	];

	type Land = {
		coordinateX: string;
		coordinateY: string;
		size: BN;
		tokenId: string;
	};
	const landOwnersMap: { [owner: string]: Land[] } = {};

	const LandContract = await ethers.getContract('Land');

	for (const presaleContractName of presaleContractNames) {
		const presaleContract = await ethers.getContract(presaleContractName);
		if (!presaleContract) console.log(`No contract found for presale: ${presaleContractName}`);
		const landQuadPurchasedEvents = await queryEvents(
			presaleContract.queryFilter.bind(presaleContract, presaleContract.filters.LandQuadPurchased()),
			startBlock
		);

		for (const event of landQuadPurchasedEvents) {
			const topCornerId: BN = event.args && event.args.topCornerId;
			const { coordinateX, coordinateY } = tokenIdToMapCoords(topCornerId);
			const size = new BN(event.args && event.args.size.toString());
			const currentLandOwner = await LandContract.callStatic.ownerOf(topCornerId);
			const land: Land = { coordinateX, coordinateY, size, tokenId: topCornerId.toString() };
			if (currentLandOwner) {
				landOwnersMap[currentLandOwner] = landOwnersMap[currentLandOwner] || [];
				landOwnersMap[currentLandOwner].push(land);
			}
		}
	}

	// write output file
	console.log(`writing output to file ${exportFilePath}`);
	fs.ensureDirSync('tmp');
	fs.writeFileSync(
		exportFilePath,
		JSON.stringify(landOwnersMap)
	);
})()