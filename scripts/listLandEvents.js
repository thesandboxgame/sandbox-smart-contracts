const Web3 = require('web3');
const rocketh = require('rocketh');
const program = require('commander');
const fs = require('fs');
const {
    getDeployedContract,
    web3,
} = require('rocketh-web3')(rocketh, Web3);

program
    .command('list')
    .description('list Land mint events')
    .action(async (cmdObj) => {
        const Land = getDeployedContract('Land');
        const latestBlock = await web3.eth.getBlock('latest');
        let fromBlock = 9434370;
        let events = [];
        while (fromBlock < latestBlock.number) {
            const newEvents = await Land.getPastEvents('Transfer', {
                filter: {from: '0x0000000000000000000000000000000000000000000000000000000000000000'},
                fromBlock,
                toBlock: fromBlock + 1000
            });
            events = events.concat(newEvents);
            fromBlock += 1001;
        }
        fs.writeFileSync('./land2MintEvents.json', JSON.stringify(events, null, '  '));
        console.log(events.length);
        // for (const event of events) {
        //     console.log(event.transactionHash + ': ');
        //     console.log(JSON.stringify(event.returnValues, null, '  '));
        // }
    });

program.parse(process.argv);

