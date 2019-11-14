const BN = require('bn.js');
const Web3 = require('web3');
const rocketh = require('rocketh');
const {
    tx,
    getBalance,
} = require('rocketh-web3')(rocketh, Web3);

async function main() {
    const balance = await getBalance('0x0f6dDcA9c25F4fAB6C0cf4d430027367b3462237');
    const balanceBN = new BN(balance);
    if (balanceBN.gt(new BN(0))) {
        const gasPrice = '3000000000';
        const gas = 21000;
        const valueToTransfer = balanceBN.sub(new BN(gas).mul(new BN(gasPrice)));
        if (valueToTransfer.gt(new BN(0))) {
            const receipt = await tx({
                from: '0xf6678ef06e5a357f2367161db3dc27da6ef9d89bb380fc979f22b3df1fefabc1',
                to: '0x741db825bcdbbbb3f91cb257a8d3dd356a7f8e9f',
                value: valueToTransfer.toString(10),
                gas,
                gasPrice,
            });

            console.log(receipt);
        } else {
            console.log('not enough ether to make the transfer');
        }
    } else {
        console.log('zero ether to transfer');
    }
}

main();