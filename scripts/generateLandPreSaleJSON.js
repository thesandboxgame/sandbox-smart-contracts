const fs = require('fs');
const {nonExposedLands, partnersLands} = require('../data/getLands');

const output = process.argv[2];
fs.writeFileSync(output, JSON.stringify(nonExposedLands, null, '    '));

const partnerLandsOutput = process.argv[3];
fs.writeFileSync(partnerLandsOutput, JSON.stringify(partnersLands, null, '    '));
