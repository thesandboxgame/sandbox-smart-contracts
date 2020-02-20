const fs = require('fs');

const landWithProofsData = fs.readFileSync('./.presale_2_proofs.json');
const landWithProofs = JSON.parse(landWithProofsData);

const reserved = {};
const reservedIds = {};
for (const land of landWithProofs) {
    if (land.reserved && land.reserved !== '0x0000000000000000000000000000000000000000') {
        reserved[land.reserved] = (reserved[land.reserved] ? reserved[land.reserved] : 0) + 1;
        reservedIds[land.x + (land.y * 408)] = land;
    }
}

const events = JSON.parse(fs.readFileSync('./land2MintEvents.json').toString()).filter((v) => v.returnValues._from === '0x0000000000000000000000000000000000000000');

// console.log(events.length);

for (const event of events) {
    const tokenId = parseInt(event.returnValues._tokenId, 10);
    const x = tokenId % 408;
    const y = Math.floor(tokenId / 408);
    if (reservedIds[tokenId]) {
        delete reservedIds[tokenId];
        if (!reserved[event.returnValues._to]) {
            console.log(x, y, event.returnValues._to);
        }
        reserved[event.returnValues._to]--;
    }
}

// console.log(reserved)
console.log(Object.values(reservedIds).filter((v) => v.reserved === '0x7a9fe22691c811ea339d9b73150e6911a5343dca').map((v) => {
    return {size: v.size, x: v.x, y: v.y, tokenId: (v.x + (v.y * 408)), reserved: v.reserved};
}));