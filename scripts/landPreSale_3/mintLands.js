const fs = require('fs');
const parseAirDropSheet = require('./parseAirDropSheet');

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
    const giveaway = await parseAirDropSheet();
    // console.log(JSON.stringify(giveaway, null, '  '));
    for (const row of giveaway) {
        // if (row.sent) {
        //     continue;
        // }
        landGroups.push({
            partner: row.partner,
            to: row.to,
            minter: row.minter,
            x: row.coordinates.x,
            y: row.coordinates.y,
            size: row.size,
        });
    }

    for (const landGroup of landGroups) {
        console.log('------------------- ' + landGroup.partner + ' -----------------------------');
        mint(landGroup.x + 204, landGroup.y + 204, landGroup.size, landGroup.to);
        console.log('');
        console.log('');
    }
})();
