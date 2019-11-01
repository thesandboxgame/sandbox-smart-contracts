const Web3 = require('web3');

function calculateLandHash(land) {
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
    });
}

function createDataArray(lands) {
    const data = [];

    lands.forEach((land) => {
        data.push(calculateLandHash(land));
    });

    return data;
}

module.exports = {
    createDataArray,
    calculateLandHash
};
