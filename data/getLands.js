const fs = require('fs');
const MerkleTree = require('../lib/merkleTree');
const {createDataArray, saltLands} = require('../lib/merkleTreeHelper');
const rawLands = require('./lands.json');
const reservedLands = require('./reserved.json');

function generateLandsForMerkleTree() {
    const reservedLandsRegistry = {};
    for (const land of reservedLands) {
        const x = land.x + 204;
        const y = land.y + 204;
        let reservedAddress;

        if (land.sandbox) {
            if (land.name !== 'Sandbox Network') {
                reportError('partner not expected as Sandbox: ' + land.name);
            }
            //  TODO ? reservedAddress = '0x81B27afBF34b78670c90F1994935b6267DC9b169';
        } else {
            switch (land.name) {
                case 'Old Skull Games': reservedAddress = '0xD98a18F688DB362aCF65dcdDb6e9FE6616697cbe';
                    break;
                case 'Korean Artists District': reservedAddress = '0x81B27afBF34b78670c90F1994935b6267DC9b169';
                    break;
                case 'My Crypto Heroes': reservedAddress = '0x8b6965eb3c78f424d75649f74af86e0bcd93d203';
                    break;
                case 'Animoca Brands': reservedAddress = '0x1b67dEE1d9FBf11D94f1cF3006172db830d2A913';
                    break;
                case 'Pixowl': reservedAddress = '0x3A31455a51FD865c92a8f9563B1a5e0B3A7269ba';
                    break;
                case 'Shaun The Sheep': reservedAddress = '0x8D7Cd362cE140B44e025D0B7e35A9Dd843A1bA8';
                    break;
                case 'Axie Infinity': reservedAddress = '0x81B27afBF34b78670c90F1994935b6267DC9b169';
                    break;
                case 'Cryptowars': reservedAddress = '0x57c8bcc1c4af411d996a6317971b9b44439c9b75';
                    break;
                case 'Battle Races': reservedAddress = '0x7532beCD60d5a8DCdA82176605dF84c228fa94dA';
                    break;
                case 'Animoca F1': reservedAddress = '0xd1A19ae358C9eD941497cEAC66478AC185E9a139';
                    break;
                case 'Blocore': reservedAddress = '0x4B7Cb5b29Be1FcDD2a16058eA5d2a7B1EA727C35';
                    break;
                case 'NonFungible.com': reservedAddress = '0x841f3a12D45651C21EcfA26546C9E77F5Ff4Fe80';
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
    return lands;
}

const lands = generateLandsForMerkleTree();

module.exports = {
    getLands: (isDeploymentChainId) => {
        let secret;
        let expose = false;
        if (isDeploymentChainId) {
            secret = fs.readFileSync('./.land_presale_1_secret');
        } else {
            secret = '0xd99c85d88ecb384d210f988028308ef7d7ffbbd33d64e7189c8e54ee2e9f6a5b';
            expose = true;
        }

        const saltedLands = saltLands(lands, secret);
        const tree = new MerkleTree(createDataArray(saltedLands));
        const merkleRootHash = tree.getRoot().hash;

        return {
            lands: expose ? saltedLands : lands,
            merkleRootHash,
        };
    },
    nonExposedLands: lands
};
