const BN = require('bn.js');
const Web3 = require('web3');
const rocketh = require('rocketh');
const program = require('commander');
const {
    tx,
    getBalance,
    web3,
} = require('rocketh-web3')(rocketh, Web3);

const sender = rocketh.accounts[0];

program
    .command('sendETH <destination>')
    .description('send ether')
    .action(async (destination, cmdObj) => {
        try {
            const balance = await getBalance(sender);
            const balanceBN = new BN(balance);
            const gasPrice = await web3.eth.getGasPrice();
            const gasPriceBN = new BN(gasPrice);
            const gas = 21000;
            const gasBN = new BN(gas);
            const valueMinusGasFeeBN = balanceBN.sub(gasPriceBN.mul(gasBN));
            const valueMinusGasFee = valueMinusGasFeeBN.toString(10);
            // console.log({balance: balanceBN.toString(10), valueMinusGasFee, to: destination});
            console.log({gas, valueMinusGasFee, to: destination});
            const receipt = await tx({from: sender, gas, value: valueMinusGasFee, to: destination});
            console.log('success', {txHash: receipt.transactionHash, gasUsed: receipt.gasUsed});
        } catch (e) {
            console.error(e);
        }
    });

program.parse(process.argv);
