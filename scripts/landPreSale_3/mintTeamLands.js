const fs = require('fs');
const parseSheet = require('../lib/parseSheet');

const landWithProofsData = fs.readFileSync('./.presale_3_proofs_1.json');
const landWithProofs = JSON.parse(landWithProofsData);

async function mint(x, y, size, address) {
    let landToBuy;
    for (const land of landWithProofs) {
        if (land.x === x && land.y === y && land.size === size) {
            landToBuy = land;
            break;
        }
    }
    if (!landToBuy) {
        console.error(`cannot find land ${x}, ${y}, ${size}`);
        process.exit(1);
    }
    if (landToBuy.reserved) {
        if (landToBuy.reserved !== address) {
            if (landToBuy.reserved === '0x7a9fe22691c811ea339d9b73150e6911a5343dca') {
                console.log('-------------------- from SANDBOX -------------------');
            } else {
                throw new Error('reserved address do not match: ' + landToBuy.reserved + ' != ' + address);
            }
        }
    } else {
        throw new Error('cannot mint non reserved address, they are for sale',);
    }
    console.log('mintQuad(address to, uint256 size, uint256 x, uint256 y, bytes calldata data');
    console.log('to:');
    console.log(address);
    console.log('size:');
    console.log(landToBuy.size);
    console.log('x:');
    console.log(landToBuy.x);
    console.log('y:');
    console.log(landToBuy.y);
    console.log('data:');
    console.log('0x');
}

(async () => {
    const landGroups = [];
    const giveaway = await parseSheet('1ND3IZdBRaEdWDaoBIqMnp4tS4FIZEWomJ9c0n1Lmw04', 'ROUND 3 — Bounties Giveaway (LANDS)', {
        startRow: 34,
        fields: {
            2: 'campaign',
            4: {
                name: 'coordinates',
                parse: (value) => {
                    let xy;
                    if (value.indexOf(',') !== -1) {
                        xy = value.split(',');
                    } else if (value.indexOf(';') !== -1) {
                        xy = value.split(';');
                    }
                    if (xy) {
                        const coordinates = {
                            x: parseInt(xy[0], 10), // +204 is donw after ward
                            y: parseInt(xy[1], 10), // +204 is donw after ward
                        };
                        if (coordinates.x && coordinates.y) {
                            return coordinates;
                        }
                    }
                    // console.log(value);
                }
            },
            6: 'name',
            7: 'address'
        },
        filter: (object) => object.coordinates && object.name
    });
    for (const row of giveaway) {
        landGroups.push({
            name: row.name,
            to: row.address,
            x: row.coordinates.x,
            y: row.coordinates.y,
            size: 1,
        });
    }

    for (const landGroup of landGroups) {
        console.log('------------------- ' + landGroup.name + ' -----------------------------');
        mint(landGroup.x + 204, landGroup.y + 204, landGroup.size, landGroup.to);
        console.log('');
        console.log('');
    }
})();
