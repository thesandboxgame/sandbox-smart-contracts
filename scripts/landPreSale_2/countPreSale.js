const Web3 = require('web3');
const BN = require('bn.js');
const fs = require('fs');
const rocketh = require('rocketh');
const program = require('commander');
const {
    call,
    getDeployedContract,
} = require('rocketh-web3')(rocketh, Web3);

const {nonExposedLands, partnersLands} = require('../../data/landPreSale_2/getLands');

function getTokenId(x, y) {
    return x + (y * 408);
}

const partnerLandsMap = {};
for (const partnerLand of partnersLands) {
    const tokenId = getTokenId(partnerLand.x, partnerLand.y);
    // console.log(tokenId);
    partnerLandsMap[tokenId] = partnerLand;
}

const partners = [];

program
    .command('count')
    .description('count presale')
    .action(async (cmdObj) => {
        const LandPreSale = getDeployedContract('LandPreSale_2');
        const events = await LandPreSale.getPastEvents('LandQuadPurchased', {
            fromBlock: 9048221,
            toBlock: 'latest'
        });
        let numLandsMinted = 0;
        let numLandsMintedFromPartner = 0;
        for (const event of events) {
            const numLands = new BN(event.returnValues.size).pow(new BN(2));
            numLandsMinted += numLands.toNumber();
            const tokenId = new BN(event.returnValues.topCornerId).toNumber();
            // console.log(tokenId);
            if (partnerLandsMap[tokenId]) {
                // console.log(partnerLandsMap[tokenId].name);
                numLandsMintedFromPartner += numLands.toNumber();
                partners.push(partnerLandsMap[tokenId]);
                delete partnerLandsMap[tokenId];
            }
        }

        const partnersLeft = [];
        for (const tokenId of Object.keys(partnerLandsMap)) {
            // console.log(JSON.stringify(partnerLandsMap[tokenId], null, '  '));
            partnersLeft.push(partnerLandsMap[tokenId]);
        }
        console.log({
            numLandsMintedFromPartner,
            numLandsMinted,
            partnerNamesLeft: partnersLeft.map((land) => land.name),
        });
        // console.log({numLandsMinted: numLandsMinted.toNumber(), numLandsMintedFromPartner, partners, partnersLeft});
    });

program.parse(process.argv);
