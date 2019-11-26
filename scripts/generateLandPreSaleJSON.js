const fs = require('fs');
const input = process.argv[2];
const output = process.argv[3];

const data = fs.readFileSync(input);
const rawLands = JSON.parse(data);

let errors = false;
function reportError(e) {
    errors = true;
    console.error(e);
}

function exitIfError() {
    if (errors) {
        process.exit(1);
    }
}

const landGroups = {};
for (const land of rawLands) {
    let estateId = land.estate;
    const x = land.coordinateX + 204 + 3;
    const y = land.coordinateY + 204 + 3;
    if (!estateId) {
        estateId = 1000 + (y * 408) + x;
    }
    const landGroup = landGroups[estateId];
    if (!landGroup) {
        landGroups[estateId] = {
            x,
            y,
            numLands: 1
        };
    } else {
        if (x < landGroup.x || y < landGroup.y) {
            landGroup.x = x;
            landGroup.y = y;
        }
        landGroup.numLands++;
    }
}
const lands = [];
let numLands = 0;
let num1x1Lands = 0;
let num3x3Lands = 0;
let num6x6Lands = 0;
let num12x12Lands = 0;
let num24x24Lands = 0;
for (const estateId of Object.keys(landGroups)) {
    const landGroup = landGroups[estateId];
    const size = Math.sqrt(landGroup.numLands);
    let price = 0;
    if (size === 1) {
        num1x1Lands++;
        price = '2000000000000000000000';
    } else if (size === 3) {
        num3x3Lands++;
        price = '17100000000000000000000';
    } else if (size === 6) {
        num6x6Lands++;
        price = '64800000000000000000000';
    } else if (size === 12) {
        num12x12Lands++;
        price = '244800000000000000000000';
    } else if (size === 24) {
        num24x24Lands++;
        price = '921600000000000000000000';
    } else {
        reportError('wrong size : ' + size);
    }

    if (!(landGroup.x % size === 0 && landGroup.y % size === 0)) {
        reportError('invalid coordinates: ' + JSON.stringify({x: landGroup.x, y: landGroup.y, size}));
    }

    if (landGroup.x < 0 || landGroup.x >= 408) {
        reportError('wrong x : ' + landGroup.x);
    }
    if (landGroup.y < 0 || landGroup.y >= 408) {
        reportError('wrong y : ' + landGroup.y);
    }
    lands.push({
        x: landGroup.x,
        y: landGroup.y,
        size,
        price,
    });
    numLands += size * size;
}
console.log({
    numGroups: lands.length,
    numLandsInOutput: numLands,
    numLandsInInput: rawLands.length,
    num1x1Lands,
    num3x3Lands,
    num6x6Lands,
    num12x12Lands,
    num24x24Lands,
});
exitIfError();
fs.writeFileSync(output, JSON.stringify(lands, null, '    '));
