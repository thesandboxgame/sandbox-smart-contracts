const rocketh = require('rocketh');
const program = require('commander');
const request = require('request');
// const Ajv = require('ajv');
// const base32 = require('base32.js');
// const fs = require('fs');
// const path = require('path');

function waitRequest(options) {
    return new Promise((resolve, reject) => {
        request(options, (error, response, body) => {
            if (error) {
                reject(error);
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

const {
    sendTxAndWait,
} = rocketh;

const {
    genesisMinter
} = rocketh.namedAccounts;

// function hashFromCIDv1(cidv1) {
//     const decoder = new base32.Decoder();
//     const binary = decoder.write(cidv1.substr(1)).finalize().toString('hex');
//     return '0x' + binary.substr(8);
// }

function reportErrorAndExit(e) {
    console.error(e);
    process.exit(1);
}

function generateRaritiesPack(raritiesArr) {
    let raritiesPack = '0x';
    for (let i = 0; i < raritiesArr.length; i += 4) {
        let byteV = 0;
        for (let j = i; j < raritiesArr.length && j < i + 4; j++) {
            if (raritiesArr[j] > 3) {
                throw new Error('rarity > 3');
            }
            const p = Math.pow(2, ((3 - (j - i)) * 2));
            byteV += (raritiesArr[j] * p);
        }
        let s = byteV.toString(16);
        if (s.length === 1) {
            s = '0' + s;
        }
        raritiesPack += s;
    }
    return raritiesPack;
}

// const schemaS = fs.readFileSync(path.join(__dirname, 'assetMetadataSchema.json'));
// const schema = JSON.parse(schemaS);
// const ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}

program
    .command('mintIds <creator> <destination> <assetIds...>')
    .description('mint assets from ids')
    .option('-u, --url <url>', 'api url')
    .option('-g, --gas <gas>', 'gas limit')
    .option('-p, --packId <packId>', 'packId')
    .option('-n, --nonce <nonce>', 'nonce')
    .option('-t, --test', 'testMode')
    .action(async (creator, destination, assetIds, cmdObj) => {
        const testMode = cmdObj.test || true; // Test only for now
        const url = (cmdObj.url || 'http://localhost:8081');
        const userData = await getJSON(url + '/users/' + creator);
        let creatorWallet;
        if (userData && userData.user) {
            creatorWallet = userData.user.Wallets[0].address; // TODO manage multiple wallet ?
        } else {
            throw new Error('no user with id ' + creator);
        }
        if (!creatorWallet) {
            throw new Error('no wallet for user with id ' + creator);
        }

        const options = {
            method: 'PATCH',
            url: url + '/assets/mintInfo',
            headers: {'Content-Type': 'application/json'},
            body: {
                assetIds,
                creator
            },
            json: true
        };
        let assetBatchInfo;
        const assetBatchInfoRes = await waitRequest(options);
        if (assetBatchInfoRes && assetBatchInfoRes.body) {
            assetBatchInfo = assetBatchInfoRes.body;
        }

        if (assetBatchInfo) {
            console.log(JSON.stringify(assetBatchInfo, null, '  '));
            const packId = cmdObj.packId || 0;
            const nonce = cmdObj.nonce;

            const gas = cmdObj.gas || 2000000; // TODO estimate

            const {supplies, rarities, hash} = assetBatchInfo;

            const raritiesPack = generateRaritiesPack(rarities);
            const suppliesArr = supplies;

            if (testMode) {
                console.log({genesisMinter, nonce, gas, creator, packId, hash, suppliesArr, raritiesPack, destination});
            } else {
                try {
                    const receipt = await sendTxAndWait({from: genesisMinter, nonce, gas}, 'GenesisBouncer', 'mintMultipleFor', creator, packId, hash, suppliesArr, raritiesPack, destination);
                    console.log('success', {txHash: receipt.transactionHash, gasUsed: receipt.gasUsed});
                } catch (e) {
                    reportErrorAndExit(e);
                }
            }
        } else {
            console.error('no info for ', assetIds);
        }
    });

program.parse(process.argv);
