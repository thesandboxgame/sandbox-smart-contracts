const fs = require('fs');
const input = process.argv[2];
const output = process.argv[3];
const reservedLandFile = process.argv.length >= 4 ? process.argv[4] : undefined;

const data = fs.readFileSync(input);
const rawLands = JSON.parse(data);

let reservedLands = [];
if (reservedLandFile) {
    const reservedLandData = fs.readFileSync(reservedLandFile);
    reservedLands = JSON.parse(reservedLandData);
}

const reservedLandsRegistry = {};
for (const land of reservedLands) {
    const x = land.x + 204;
    const y = land.y + 204;
    let reservedAddress;

    if (land.sandbox) {
        if (land.name !== 'Sandbox Network') {
            reportError('partner not expected as Sandbox: ' + land.name);
        }
        reservedAddress = '0x81B27afBF34b78670c90F1994935b6267DC9b169';
    } else {
        switch (land.name) {
            case 'Old Skull Games': reservedAddress = '0xD98a18F688DB362aCF65dcdDb6e9FE6616697cbe';
                break;
            case 'Korean Artists District': reservedAddress = '0x81B27afBF34b78670c90F1994935b6267DC9b169';
                break;
            case 'My Crypto Heroes': reservedAddress = '0x8b6965eb3c78f424d75649f74af86e0bcd93d203';
                break;
            case 'Animoca Brands': reservedAddress = '0x9a3b0D0B08fb71F1a5E0F248Ad3a42C341f7837c'; // TODO
                break;
            case 'Pixowl': reservedAddress = '0x9a3b0D0B08fb71F1a5E0F248Ad3a42C341f7837c'; // TODO
                break;
            case 'Shaun The Sheep': reservedAddress = '0x9a3b0D0B08fb71F1a5E0F248Ad3a42C341f7837c'; // TODO
                break;
            case 'Axie Infinity': reservedAddress = '0x81B27afBF34b78670c90F1994935b6267DC9b169';
                break;
            case 'Cryptowars': reservedAddress = '0x57c8bcc1c4af411d996a6317971b9b44439c9b75';
                break;
            case 'Battle Races': reservedAddress = '0x9a3b0D0B08fb71F1a5E0F248Ad3a42C341f7837c'; // TODO
                break;
            case 'Animoca F1': reservedAddress = '0x9a3b0D0B08fb71F1a5E0F248Ad3a42C341f7837c'; // TODO
                break;
            case 'Blocore': reservedAddress = '0x9a3b0D0B08fb71F1a5E0F248Ad3a42C341f7837c'; // TODO
                break;
            default:
                reportError('partner not expected: ' + land.name);
        }
    }
    reservedLandsRegistry[x + (408 * y)] = reservedAddress;
}

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
    const x = land.coordinateX + 204;
    const y = land.coordinateY + 204;
    if (!estateId) {
        estateId = 1000 + (y * 408) + x;
    }
    let landGroup = landGroups[estateId];
    if (!landGroup) {
        landGroups[estateId] = {
            x,
            y,
            numLands: 1
        };
        landGroup = landGroups[estateId];
    } else {
        if (x < landGroup.x || y < landGroup.y) {
            landGroup.x = x;
            landGroup.y = y;
        }
        landGroup.numLands++;
    }

    const reservedAddress = reservedLandsRegistry[x + (y * 408)];
    if (reservedAddress) {
        if (landGroup.reserved) {
            reportError('already reserved ' + JSON.stringify({x: landGroup.x, y: landGroup.y}));
        }
        landGroup.reserved = reservedAddress;
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
        reserved: landGroup.reserved
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
