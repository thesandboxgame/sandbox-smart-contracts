const fs = require('fs');
const {nonExposedLands, partnersLands} = require('../../data/landPreSale_2/getLands');

const output = process.argv[2];
fs.writeFileSync(output, JSON.stringify(nonExposedLands, null, '    '));

let totalPartnerLands = 0;
for (const partnersLand of partnersLands) {
    totalPartnerLands += partnersLand.size * partnersLand.size;
}

const partnerLandsOutput = process.argv[3];
fs.writeFileSync(partnerLandsOutput, JSON.stringify({partnersLands, totalPartnerLands}, null, '    '));
