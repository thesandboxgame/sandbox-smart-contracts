const Web3 = require('web3');
const rocketh = require('rocketh');
const program = require('commander');
const ethers = require('ethers');
const {BigNumber} = ethers;

const {
    getDeployedContract,
} = require('rocketh-web3')(rocketh, Web3);

const fs = require('fs');

const landWithProofsData = fs.readFileSync('./.presale_2_proofs.json');
const landWithProofs = JSON.parse(landWithProofsData);

const reserved = {};
const reservedIds = {};
for (const land of landWithProofs) {
    if (land.reserved) {
        reserved[land.reserved] = (reserved[land.reserved] ? reserved[land.reserved] : 0) + 1;
        reservedIds[land.x + (land.y * 408)] = land;
    }
}

const landSale = {
    numGroups: 3103,
    numLandsInOutput: 8640,
    numLandsInInput: 8640,
    num1x1Lands: 2907,
    num3x3Lands: 145,
    num6x6Lands: 35,
    num12x12Lands: 14,
    num24x24Lands: 2,
    numSandboxReservedGroups: 57,
    numSandboxReserved: 1764,
    numReserved: 2448,
    numReservedGroup: 76
};

program
    .command('list')
    .description('list land sale')
    .action(async (cmdObj) => {
        
        const buyersFor1And2 = {};
        const destinationsFor1And2 = {};

        const LandPreSale_1 = getDeployedContract('LandPreSale_1');
        const events1 = await LandPreSale_1.getPastEvents('LandQuadPurchased', {
            fromBlock: 9048221,
            toBlock: 'latest'
        });
        for (const event of events1) {
            const {size, token, amountPaid, buyer, to} = event.returnValues;
            if (!buyersFor1And2[buyer]) {
                buyersFor1And2[buyer] = true;
            }
            if (!destinationsFor1And2[to]) {
                destinationsFor1And2[to] = true;
            }
        }

        const LandPreSale_2 = getDeployedContract('LandPreSale_2');
        const events = await LandPreSale_2.getPastEvents('LandQuadPurchased', {
            fromBlock: 9048221,
            toBlock: 'latest'
        });
        const buyers = {};
        const destinations = {};
        let uniqueBuyers = 0;
        let uniqueDestinations = 0;
        let newBuyers = 0;
        const eventsToProcess = events;//.filter((v, i) => i === 0);
        let numPurchases = 0;
        let numLand1x1 = 0;
        let numLand3x3 = 0;
        let numLand6x6 = 0;
        let numLand12x12 = 0;
        let numLand24x24 = 0;
        let numLandWithDAI = 0;
        let numLandWithETH = 0;
        let numPurchasesWithDAI = 0;
        let numPurchasesWithETH = 0;
        let numDAI = BigNumber.from(0);
        let numETH = BigNumber.from(0);
        for (const event of eventsToProcess) {
            numPurchases++;
            const {size, token, amountPaid, buyer, to, topCornerId} = event.returnValues;
            if (size === '1') {
                numLand1x1++;
            } else if (size === '3') {
                numLand3x3++;
            } else if (size === '6') {
                numLand6x6++;
            } else if (size === '12') {
                numLand12x12++;
            } else if (size === '24') {
                numLand24x24++;
            } else {
                console.log('error, invalid size ', size);
            }
            if (token === '0x0000000000000000000000000000000000000000') {
                numPurchasesWithETH++;
                numLandWithETH += size * size;
                numETH = numETH.add(amountPaid);
            } else {
                numPurchasesWithDAI++;
                numLandWithDAI += size * size;
                numDAI = numDAI.add(amountPaid);
            }
            if (!buyers[buyer]) {
                buyers[buyer] = true;
                uniqueBuyers++;
            }
            if (!destinations[to]) {
                destinations[to] = true;
                uniqueDestinations++;
            }
            if (!buyersFor1And2[buyer]) {
                buyersFor1And2[buyer] = true;
                newBuyers++;
            }

            if (reservedIds[parseInt(topCornerId)]) {
                console.log('' + topCornerId + ' taken');
                delete reservedIds[parseInt(topCornerId)];
                reserved[buyer]--;
            }
        }
        console.log({
            newBuyers,
            uniqueDestinations,
            uniqueBuyers,
            numLand1x1,
            numLand3x3,
            numLand6x6,
            numLand12x12,
            numLand24x24,
            numLands: numLand1x1 + (numLand3x3 * 9) + (numLand6x6 * 6 * 6) + (numLand12x12 * 12 * 12) + (numLand24x24 * 24 * 24),
            numLandWithDAI,
            numLandWithETH,
            numPurchases,
            numPurchasesWithDAI,
            numPurchasesWithETH,
            numETH: numETH.div('1000000000000000').toNumber() / 1000,
            numDAI: numDAI.div('1000000000000000').toNumber() / 1000,
        });

        function percent(v1, v2) {
            return Math.floor((v1 * 10000) / v2) / 100;
        }

        const numLands = numLand1x1 + (numLand3x3 * 9) + (numLand6x6 * 6 * 6) + (numLand12x12 * 12 * 12) + (numLand24x24 * 24 * 24);
        const numLandsInSale = landSale.numLandsInInput - landSale.numReserved;
        const numPurchasesInSale = landSale.numGroups - landSale.numReservedGroup;
        console.log({
            // numLand1x1: percent(numLand1x1, landSale.num1x1Lands),
            // numLand3x3: percent(numLand3x3, landSale.num3x3Lands),
            // numLand6x6: percent(numLand6x6, landSale.num6x6Lands),
            // numLand12x12: percent(numLand12x12, landSale.num12x12Lands),
            // numLand24x24: percent(numLand24x24, landSale.num24x24Lands),
            numLands: percent(numLands, numLandsInSale),
            numLandsLeft: numLandsInSale - numLands,
            numPurchasesLeft: numPurchasesInSale - numPurchases,
            // numLandWithDAI: percent(numLandWithDAI, numLands),
            // numLandWithETH: percent(numLandWithETH, numLands),
            numPurchases: percent(numPurchases, numPurchasesInSale),
            // numPurchasesWithDAI: percent(numPurchasesWithDAI, numPurchases),
            // numPurchasesWithETH: percent(numPurchasesWithETH, numPurchases),
        });

        // console.log(reservedIds);
        // console.log(reserved);
    });

program.parse(process.argv);

