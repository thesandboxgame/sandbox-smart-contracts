const fs = require('fs');

const landWithProofsData = fs.readFileSync('./.presale_2_proofs.json');
const landWithProofs = JSON.parse(landWithProofsData);

function mint(x, y, size, address) {
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
            throw new Error('reserved address do not match', landToBuy.reserved, address);
        }
    } else {
        console.log('--- from Sandbox ---');
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

const landGroups = [
    {
        name: 'Opera',
        address: '0x4be5f7c9912afd58bcda39b0a4ec76e7b21ba0f1',
        x: 15,
        y: 30,
        size: 3,
    },
    {
        name: 'PlayDapp',
        address: '0x5c31a139ba273ebad8d1b1ae22e4617ec0f32d4c',
        x: 66,
        y: 60,
        size: 6,
    },
];
for (const landGroup of landGroups) {
    console.log('------------------- ' + landGroup.name + ' -----------------------------');
    mint(landGroup.x + 204, landGroup.y + 204, landGroup.size, landGroup.address);
    console.log('');
    console.log('');
}