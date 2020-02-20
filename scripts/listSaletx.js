const Web3 = require('web3');
const rocketh = require('rocketh');
const program = require('commander');
const ethers = require('ethers');
const {BigNumber} = ethers;
const axios = require('axios');
const fs = require('fs');
const reveal = require('eth-reveal');

const {
    getDeployedContract,
    fetchReceipt,
} = require('rocketh-web3')(rocketh, Web3);

const ETHERSCAN_TOKEN = fs.readFileSync('./.etherscan_token').toString();

async function getTxList(address, page, offset) {
    const response = await axios.get(`https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=${page}&offset=${offset}&sort=asc&apikey=${ETHERSCAN_TOKEN}`);
    return response.data.result;
}

async function getTotalList(address) {
    let total = [];
    let page = 1;
    const offset = 1000;
    let fine = true;
    while (fine) {
        let txs;
        try {
            txs = await getTxList(address, page, offset);
        } catch (e) {
            console.error('Error txList', e);
            txs = [];
            // page--; // retry
        }
        if (txs.length >= offset) {
            page++;
        } else {
            fine = false;
        }
        total = total.concat(txs);
    }
    return total;
}

program
    .command('list')
    .description('list land sale')
    .action(async (cmdObj) => {
        const LandPreSale_2 = getDeployedContract('LandPreSale_2');
        const address = LandPreSale_2.options.address;
        let txs = await getTotalList(address);
        // console.log(JSON.stringify(txs[0], null, '  '));
        const dict = {};
        txs = txs.filter((tx) => {
            if (!dict[tx.hash]) {
                dict[tx.hash] = true;
                return true;
            }
            return false;
        });
        const numTxs = txs.length;
        const failures = txs.filter((tx) => (tx.isError !== '0' || tx.txreceipt_status !== '1'));
        // console.log(JSON.stringify(failures, null, '  '));

        for (const failure of failures) {
            // console.log(failure.hash);
            // const result = await reveal({
            //     hash: failure.hash,
            //     // TODO network: 'mainnet', // default (supports kovan, ropsten and rinkeby)
            //     // etherscanKey: ETHERSCAN_TOKEN,
            // });
            // console.log(result.revertReason);
        }

        const numFailures = failures.length;
        // for (const tx of txs) {
        //     if (tx.isError !== '0' || tx.txreceipt_status !== '1') {
        //         // console.log(JSON.stringify(tx, null, '  '));
        //         // const receipt = await fetchReceipt(tx.hash);
        //         // console.log(JSON.stringify(receipt, null, '  '));
        //         // const response = await axios.get(`https://api.etherscan.io/api?module=transaction&action=getstatus&txhash=${tx.hash}&apikey=${ETHERSCAN_TOKEN}`);
        //         // console.log(JSON.stringify(response.data.result, null, '  '));

        //         // const errorResponse = await axios.get(`https://api.etherscan.io/api?module=transaction&action=gettxreceiptstatus&txhash=${tx.hash}&apikey=${ETHERSCAN_TOKEN}`);
        //         // console.log(JSON.stringify(errorResponse.data.result, null, '  '));

        //         // const txReceiptResponse = await axios.get(`https://api.etherscan.io/api?module=proxy&action=eth_getTransactionReceipt&txhash=${tx.hash}&apikey=${ETHERSCAN_TOKEN}`);
        //         // console.log(JSON.stringify(txReceiptResponse.data.result, null, '  '));

        //         const txResponse = await axios.get(`https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${tx.hash}&apikey=${ETHERSCAN_TOKEN}`);
        //         console.log(JSON.stringify(txResponse.data.result, null, '  '));
        //     }
        // }

        console.log({
            numTxs,
            numFailures,
        });
    });

program.parse(process.argv);

