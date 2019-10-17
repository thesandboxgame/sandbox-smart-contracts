const Ajv = require('ajv');
const base32 = require('base32.js');
const Web3 = require('web3');
const rocketh = require('rocketh');
const program = require('commander');
const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
const {deployToIPFS} = require('./ipfs');
const {
    getDeployedContract,
    tx,
} = require('rocketh-web3')(rocketh, Web3);

let Bouncer;
let operator;
let testMode = false;
try {
    Bouncer = getDeployedContract('TestBouncer');
} catch (e) {
    console.log('cannot get Bouncer, continue in test mode');
    testMode = true;
}

try {
    operator = rocketh.accounts[0];
} catch (e) {
    console.log('cannot get operator, continue in test mode');
    testMode = true;
}

function hashFromCIDv1(cidv1) {
    const decoder = new base32.Decoder();
    const binary = decoder.write(cidv1.substr(1)).finalize().toString('hex');
    return '0x' + binary.substr(8);
}

// program
//     .command('mintAll <folderPath>')
//     .description('mint all assets in each creator folders')
//     .action(async (folderPath, cmdObj) => {
//         traverse        
//     });

function reportErrorAndExit(e) {
    console.error(e);
    process.exit(1);
}
function access(obj, fieldName, cond) {
    if (!obj[fieldName]) {
        reportErrorAndExit('no field ' + fieldName);
    }
    const v = obj[fieldName];
    if (cond && !cond(v)) {
        reportErrorAndExit(`field ${fieldName} failed condition`);
    }
    return v;
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

const schemaS = fs.readFileSync(path.join(__dirname, 'assetMetadataSchema.json'));
const schema = JSON.parse(schemaS);
const ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}
const validate = ajv.compile(schema);

program
    .command('mintBatchFromFile <filePath>')
    .description('mint assets specified in the file')
    .option('-g, --gas <gas>', 'gas limit')
    .option('-p, --packId <packId>', 'packId')
    .option('-n, --nonce <nonce>', 'nonce')
    .option('-r, --real', 'real')
    .action(async (filePath, cmdObj) => {
        if (cmdObj.real) {
            Bouncer = getDeployedContract('GenesisBouncer');
        }
        let data;
        try {
            data = JSON.parse(fs.readFileSync(filePath).toString());
        } catch (e) {
            reportErrorAndExit(e);
            return;
        }
        let numAssets = 0;
        const assetsPerCreator = {};
        for (const assetData of data) {
            if (!assetData.metadata || !validate(assetData.metadata)) {
                reportErrorAndExit('error in metadata, does not follow schema!');
            }
            if (typeof assetData.rarity !== 'number' || !Number.isInteger(assetData.rarity)) {
                reportErrorAndExit('rarity needs to be a integer number');
            }
            if (assetData.rarity < 0 || assetData.rarity > 3) {
                reportErrorAndExit('rarity can only be 0 (common), 1 (rare), 2 (epic) or 3 (lengendary)');
            }

            if (typeof assetData.supply !== 'number' || !Number.isInteger(assetData.supply)) {
                reportErrorAndExit('supply needs to be a integer number');
            }

            const creator = assetData.metadata.sandbox.creator;
            const assetList = assetsPerCreator[creator] || [];
            assetsPerCreator[creator] = assetList;
            assetList.push(assetData);
            numAssets++;
        }

        console.log(`${numAssets} assets across ${Object.keys(assetsPerCreator).length} creators ready to be processed`);

        const ipfsFoldersFolder = '__ipfs__';
        rimraf.sync(ipfsFoldersFolder);
        fs.mkdirSync(ipfsFoldersFolder);
        const folderCreated = {};
        const batches = [];
        for (const creator of Object.keys(assetsPerCreator)) {
            if (!folderCreated[creator]) {
                try {
                    fs.mkdirSync(path.join(ipfsFoldersFolder, creator));
                } catch (e) { }
                folderCreated[creator] = true;
            }

            const rarityArray = [];
            let rarityGreaterThan0 = false;
            const suppliesArr = [];
            let index = 0;
            for (const asset of assetsPerCreator[creator]) {
                const content = JSON.stringify(asset.metadata, null, '    '); // 4 spaces for indentation
                fs.writeFileSync(path.join(ipfsFoldersFolder, creator, `${index}.json`), content);
                suppliesArr.push(asset.supply);
                rarityArray.push(asset.rarity);
                if (asset.rarity > 0) {
                    rarityGreaterThan0 = true;
                }
                index++;
            }

            let raritiesPack = '0x';
            if (rarityGreaterThan0) {
                raritiesPack = generateRaritiesPack(rarityArray);
            }

            let cidv1;
            try {
                cidv1 = await deployToIPFS(path.join('__ipfs__', creator), {dev: false, test: false});
            } catch (e) {
                console.error(e);
                reportErrorAndExit('failed to upload to ipfs'); // TODO remove what is already deployed
            }

            const hash = hashFromCIDv1(cidv1);
            const owner = creator;
            const packId = cmdObj.packId || 0;

            batches.push(
                {creator, packId, cidv1, hash, suppliesArr, raritiesPack, owner}
            );
        }
        if (!testMode) {
            console.log('MINTING...');
            for (const batch of batches) {
                const {creator, packId, cidv1, hash, suppliesArr, raritiesPack, owner} = batch;
                console.log({creator, packId, cidv1, hash, suppliesArr, raritiesPack, owner});
                try {
                    // TODO save txHash // TODO save progress
                    const receipt = await tx({from: operator, nonce: cmdObj.nonce, gas: cmdObj.gas || 1000000}, Bouncer, 'mintMultipleFor', creator, packId, hash, suppliesArr, raritiesPack, owner);
                    // TODO save progress
                    console.log('success', {txHash: receipt.transactionHash, gasUsed: receipt.gasUsed});
                } catch (e) {
                    reportErrorAndExit(e);
                }
            }
        }
    });

program
    .command('mintFor <creator> <packId> <cidv1> <supply> <rarity> <owner>')
    .option('-g, --gas', 'gas limit')
    .description('mint one type')
    .action(async (creator, packId, cidv1, supply, rarity, owner, cmdObj) => {
        // const cidv1 = 'bafybeih6rvyphidjoekzedidlmvpeeh4esobdpzu6475zdlddqre533ufq';
        const hash = hashFromCIDv1(cidv1);

        console.log({creator, packId, cidv1, hash, supply, rarity, owner, cmdObj});
        // try {
        //     const receipt = await tx({from: operator, gas: cmdObj.gas || 1000000}, Bouncer, 'mintFor', creator, packId, hash, supply, rarity, owner);
        //     console.log('success', {txHash: receipt.transactionHash, gasUsed: receipt.gasUsed});
        // } catch (e) {
        //     console.error(e);
        // }
    });

program
    .command('mintMultipleFor <creator> <packId> <cidv1> <supplies> <rarities> <owner>')
    .option('-g, --gas', 'gas limit')
    .description('mint multiple type at once')
    .action(async (creator, packId, cidv1, supplies, rarities, owner, cmdObj) => {
        const hash = hashFromCIDv1(cidv1);
        const suppliesArr = supplies.split(',');
        const raritiesArr = rarities.split(',');
        const raritiesPack = generateRaritiesPack(raritiesArr);

        console.log({creator, packId, cidv1, hash, suppliesArr, raritiesPack, owner});
        // try {
        //     const receipt = await tx({from: operator, gas: cmdObj.gas || 1000000}, Bouncer, 'mintMultipleFor', creator, packId, hash, suppliesArr, raritiesPack, owner);
        //     console.log('success', {txHash: receipt.transactionHash, gasUsed: receipt.gasUsed});
        // } catch (e) {
        //     console.error(e);
        // }
    });

program.parse(process.argv);
