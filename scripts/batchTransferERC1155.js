const BN = require('bn.js');
const Web3 = require('web3');
const rocketh = require('rocketh');
const program = require('commander');
const {
    tx,
    call,
    getDeployedContract,
} = require('rocketh-web3')(rocketh, Web3);

const {
    emptyBytes
} = require('../test/utils')

const sender = rocketh.accounts[0];

program
    .command('batch <destination> <items...>')
    .description('batchTransfer of ERC1155 tokens')
    .option('--gasPrice <gasPrice>', 'gasPrice to user')
    .option('-t, --test', 'test mode')
    .action(async (destination, items, cmdObj) => {
        const Asset = getDeployedContract('Asset');
        const balances = [];
        for (const item of items) {
            const balance = await call(Asset, 'balanceOf', sender, item);
            balances.push(balance);
        }
        const gasPrice = cmdObj.gasPrice;
        console.log({
            asset: Asset.options.address,
            sender,
            destination,
            items,
            balances,
            gasPrice
        });

        if (!cmdObj.test) {
            const receipt = await tx({from: sender, gas: 1000000, gasPrice}, Asset, 'safeBatchTransferFrom', sender, destination, items, balances, emptyBytes);
            console.log(receipt);
        } else {
            console.log('was for test only');
        }
    });

program.parse(process.argv);
