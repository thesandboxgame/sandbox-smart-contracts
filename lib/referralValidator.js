function createReferral(
    web3,
    privateKey,
    referrer,
    referee,
    expiryTime,
    commissionRate,
) {
    const hashedData = web3.utils.soliditySha3(
        {
            type: 'address',
            value: referrer,
        },
        {
            type: 'address',
            value: referee,
        },
        {
            type: 'uint256',
            value: expiryTime,
        },
        {
            type: 'uint256',
            value: commissionRate,
        },
    );

    const sig = web3.eth.accounts.sign(hashedData, privateKey);

    return sig;
}

module.exports = {
    createReferral,
};
