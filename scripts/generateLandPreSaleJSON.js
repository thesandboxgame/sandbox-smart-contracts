const fs = require('fs');
const {nonExposedLands} = require('../data/getLands');

const output = process.argv[2];
fs.writeFileSync(output, JSON.stringify(nonExposedLands, null, '    '));
