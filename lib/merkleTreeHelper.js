const Web3 = require('web3');
const crypto = require('crypto');

function calculateLandHash(land, salt) {
    return Web3.utils.soliditySha3({
        type: 'uint16',
        value: land.x,
    }, {
        type: 'uint16',
        value: land.y,
    }, {
        type: 'uint16',
        value: land.size,
    }, {
        type: 'uint256',
        value: Web3.utils.toBN(land.price),
    }, {
        type: 'address',
        value: land.reserved || '0x0000000000000000000000000000000000000000',
    }, {
        type: 'bytes32',
        value: land.salt || salt
    });
}

function saltLands(lands, secret) {
    const saltedLands = [];
    for (const land of lands) {
        let salt = land.salt;
        if (!salt) {
            if (!secret) {
                throw new Error('Land need to have a salt or be generated via secret');
            }
            salt = '0x' + crypto.createHmac('sha256', secret)
                .update(calculateLandHash(land, '0x0000000000000000000000000000000000000000'))
                .digest('hex');
        }
        saltedLands.push({
            x: land.x,
            y: land.y,
            size: land.size,
            price: land.price,
            reserved: land.reserved,
            salt
        });
    }
    return saltedLands;
}

function createDataArray(lands, secret) {
    const data = [];

    lands.forEach((land) => {
        let salt = land.salt;
        if (!salt) {
            if (!secret) {
                throw new Error('Land need to have a salt or be generated via secret');
            }
            salt = '0x' + crypto.createHmac('sha256', secret)
                .update(calculateLandHash(land, '0x0000000000000000000000000000000000000000'))
                .digest('hex');
        }
        data.push(calculateLandHash(land, salt));
    });

    return data;
}

module.exports = {
    createDataArray,
    calculateLandHash,
    saltLands
};
