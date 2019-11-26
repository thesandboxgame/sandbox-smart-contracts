const rocketh = require('rocketh');
const program = require('commander');
const request = require('request');
const Web3 = require('web3');
const web3 = new Web3(rocketh.ethereum);

const {
    sendTxAndWait,
    call,
    getDeployedContract,
} = rocketh;

const {
    bundleSandSaleManager,
} = rocketh.namedAccounts;

function reportErrorAndExit(e) {
    console.error(e);
    process.exit(1);
}

function waitRequest(options) {
    return new Promise((resolve, reject) => {
        request(options, (error, response, body) => {
            if (error) {
                reject(error);
            } else if (body && body.error) {
                reject(body.error);
            } else {
                resolve({response, body});
            }
        });
    });
}

async function getJSON(url) {
    const options = {
        method: 'GET',
        url,
        headers: {'Content-Type': 'application/json'},
        json: true
    };
    const res = await waitRequest(options);
    if (res && res.body) {
        return res.body;
    }
    throw new Error('nothing');
}

program
    .command('setup <numPacks> <sandAmountPerPack> <priceUSDPerPack> <assetIds...>')
    // .description('mint assets from ids')
    .option('-u, --url <url>', 'api url')
    // .option('-g, --gas <gas>', 'gas limit')
    // .option('-p, --packId <packId>', 'packId')
    // .option('-n, --nonce <nonce>', 'nonce')
    // .option('-t, --test', 'testMode')
    .action(async (numPacks, sandAmountPerPack, priceUSDPerPack, assetIds, cmdObj) => {
        let url = (cmdObj.url || 'http://localhost:8081');
        if (url === 'production') {
            url = 'https://api.sandbox.game';
        } else if (url === 'dev' || url === 'development') {
            url = 'https://api-develop.sandbox.game';
        } else if (url === 'staging' || url === 'development') {
            url = 'https://api-stage.sandbox.game';
        }
        const BundleSandSale = getDeployedContract('BundleSandSale');
        const from = bundleSandSaleManager;
        const to = BundleSandSale.address;
        const tokenIds = [];
        const amounts = [];
        for (const assetId of assetIds) {
            const assetData = await getJSON(url + '/assets/' + assetId);
            if (!(assetData && assetData.asset && assetData.asset.blockchainId)) {
                reportErrorAndExit('asset not yet minted ' + assetId);
            }
            const tokenId = assetData.asset.blockchainId;
            const balance = await call('Asset', 'balanceOf', from, tokenId);
            if (balance === 0) {
                reportErrorAndExit('zero balance for asset ' + assetId);
            }
            tokenIds.push(tokenId);
            amounts.push(balance);
        }
        const data = web3.eth.abi.encodeParameters([
            'uint256',
            'uint256',
            'uint256',
        ], [
            numPacks,
            sandAmountPerPack,
            priceUSDPerPack,
        ]);
        console.log({from, to, tokenIds, amounts, data});
        // TODO
        // await sendTxAndWait({from}, 'Asset', 'safeBatchTransferFrom', from, to, tokenIds, amounts, data);
    });

program.parse(process.argv);
