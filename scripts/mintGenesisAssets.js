const rocketh = require('rocketh');
const program = require('commander');
const request = require('request').defaults({jar: true}); // enable cookies
const {getValidator} = require('../lib/metadata');
const fs = require('fs');

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

const credentials = JSON.parse(fs.readFileSync('.sandbox_credentials'));

// const schemaS = fs.readFileSync(path.join(__dirname, 'assetMetadataSchema.json'));
// const schema = JSON.parse(schemaS);
// const ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}

program
    .command('mintIds <creator> <destination> <assetIds...>')
    .description('mint assets from ids')
    .option('-u, --url <url>', 'api url')
    .option('-w, --webUrl <webUrl>', 'web url')
    .option('-g, --gas <gas>', 'gas limit')
    .option('-p, --packId <packId>', 'packId')
    .option('-n, --nonce <nonce>', 'nonce')
    .option('-t, --test', 'testMode')
    .action(async (creator, destination, assetIds, cmdObj) => {
        const propertiesValues = {};
        const propertiesMaxValue = {};
        const testMode = cmdObj.test || true; // Test only for now
        let webUrl = (cmdObj.webUrl || 'http://localhost:8081');
        let url = (cmdObj.url || 'http://localhost:8081');
        console.log({url, webUrl});
        if (url === 'production') {
            url = 'https://api.sandbox.game';
            webUrl = 'https://www.sandbox.game';
        } else if (url === 'dev' || url === 'development') {
            url = 'https://api-develop.sandbox.game';
            webUrl = 'https://develop.sandbox.game';
        } else if (url === 'staging' || url === 'development') {
            url = 'https://api-stage.sandbox.game';
            webUrl = 'https://stage.sandbox.game';
        }
        console.log({url, webUrl});
        await waitRequest({
            method: 'POST',
            url: url + '/auth/login',
            body: credentials,
            json: true
        });

        const validate = getValidator(webUrl);
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

        let i = 0;
        for (const assetId of assetIds) {
            const assetData = await getJSON(url + '/assets/' + assetId);
            if (assetData && assetData.asset) {
                if (assetData.asset.blockchainId) {
                    throw new Error('Asset already minted ' + assetId);
                }
                if (assetData.asset.Creator.id !== creator) {
                    throw new Error(`Asset with id ${assetId} does not belong to specified creator `);
                }

                const assetMetadataData = await getJSON(url + '/assets/' + assetId + '/metadata');
                if (!assetMetadataData.metadata) {
                    reportErrorAndExit('no metadata for asset ' + assetId);
                }

                if (!validate(assetMetadataData.metadata)) {
                    console.error(validate.errors);
                    console.log(JSON.stringify(assetMetadataData.metadata, null, '  '));
                    reportErrorAndExit('error in metadata, does not follow schema!');
                }

                // checks :
                // creator checks :
                if (assetMetadataData.metadata.sandbox.creator !== creatorWallet) {
                    reportErrorAndExit(`creator wallet do not match, metadata (${assetMetadataData.metadata.sandbox.creator})  != wallet ${creatorWallet}`);
                }
                // checks values and rarity match
                let total = 0;
                let max = 0;
                if (assetMetadataData.metadata.properties.length !== 5) {
                    reportErrorAndExit(`wrong number fo properties for asset ${assetId}`);
                }
                for (const property of assetMetadataData.metadata.properties) {
                    if (property.value > max) {
                        max = property.value;
                    }
                    total += property.value;
                }
                propertiesMaxValue[assetId] = max;
                propertiesValues[assetId] = total;
            } else {
                throw new Error('no Asset with id ' + assetId);
            }
            i++;
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
            // console.log(JSON.stringify(assetBatchInfo, null, '  '));
            const packId = cmdObj.packId || 0;
            const nonce = cmdObj.nonce;

            const gas = cmdObj.gas || 2000000; // TODO estimate

            const {supplies, rarities, hash} = assetBatchInfo;

            for (let i = 0; i < assetIds.length; i++) {
                const assetId = assetIds[i];
                const rarity = rarities[i];
                const propertiesTotalValue = propertiesValues[assetId];
                const maxValue = propertiesMaxValue[assetId];
                let expectedValue = 0;
                let expectedMaxValue = 0;
                if (rarities[i] === 0) {
                    expectedValue = 50;
                    expectedMaxValue = 25;
                } else if (rarities[i] === 1) {
                    expectedValue = 100;
                    expectedMaxValue = 50;
                } else if (rarities[i] === 2) {
                    expectedValue = 150;
                    expectedMaxValue = 75;
                } else if (rarities[i] === 3) {
                    expectedValue = 200;
                    expectedMaxValue = 100;
                } else {
                    reportErrorAndExit(`wrong rarity for asset ${assetId}`);
                }
                if (!(propertiesTotalValue === expectedValue)) {
                    reportErrorAndExit(`asset ${assetId} with rarity ${rarity} got wrong total value ${propertiesTotalValue} it should be  ${expectedValue}`);
                }
                if (!(maxValue === expectedMaxValue)) {
                    reportErrorAndExit(`asset ${assetId} with rarity ${rarity} got wrong max value ${maxValue} it should be  ${expectedMaxValue}`);
                }
            }

            const raritiesPack = generateRaritiesPack(rarities);
            const suppliesArr = supplies;

            if (testMode) {
                console.log({genesisMinter, nonce, gas, creatorWallet, packId, hash, suppliesArr, raritiesPack, destination});
            } else {
                try {
                    const receipt = await sendTxAndWait({from: genesisMinter, nonce, gas}, 'GenesisBouncer', 'mintMultipleFor', creatorWallet, packId, hash, suppliesArr, raritiesPack, destination);
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
