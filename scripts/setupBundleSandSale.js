const rocketh = require('rocketh');
const program = require('commander');

const {
    sendTxAndWait,
} = rocketh;

const {
    bundleSandSaleManager,
} = rocketh.namedAccounts;

// function reportErrorAndExit(e) {
//     console.error(e);
//     process.exit(1);
// }

program
    .command('setup')
    // .description('mint assets from ids')
    // .option('-u, --url <url>', 'api url')
    // .option('-g, --gas <gas>', 'gas limit')
    // .option('-p, --packId <packId>', 'packId')
    // .option('-n, --nonce <nonce>', 'nonce')
    // .option('-t, --test', 'testMode')
    .action(async () => {
        const from = bundleSandSaleManager;
        const to = '0x0000000000000000000000000000000000000000'; // TODO
        const ids = [0]; // TODO
        const amounts = [0]; // TODO
        const emptyBytes = '0x'; // TODO
        await sendTxAndWait({from}, 'Asset', 'safeBatchTransferFrom', from, to, ids, amounts, emptyBytes);
    });

program.parse(process.argv);
