const Web3 = require('web3');
const rocketh = require('rocketh');
const program = require('commander');
const {
    getDeployedContract,
} = require('rocketh-web3')(rocketh, Web3);

program
    .command('list <address>')
    .description('list assets transfer event')
    .action(async (address, cmdObj) => {
        const Asset = getDeployedContract('Asset');
        const events = await Asset.getPastEvents('TransferBatch', {
            filter: {to: address},
            fromBlock: 9048221,
            toBlock: 'latest'
        });
        for (const event of events) {
            console.log(event.transactionHash + ': ');
            console.log(JSON.stringify(event.returnValues, null, '  '));
        }
    });

program.parse(process.argv);

