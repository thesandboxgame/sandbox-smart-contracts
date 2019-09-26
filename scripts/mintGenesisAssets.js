const base32 = require('base32.js');
const Web3 = require('web3');
const rocketh = require('rocketh');
const program = require('commander');
const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
const {
    getDeployedContract,
    tx,
} = require('rocketh-web3')(rocketh, Web3);

let Bouncer = getDeployedContract('TestBouncer');

const operator = rocketh.accounts[0];

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

function reportError(e) {
    console.error(e);
    process.exit(1);
}
function access(obj, fieldName, cond) {
    if (!obj[fieldName]) {
        reportError('no field ' + fieldName);
    }
    const v = obj[fieldName];
    if (cond && !cond(v)) {
        reportError(`field ${fieldName} failed condition`);
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

program
    .command('mintFromFile <filePath>')
    .description('mint assets specified in the file')
    .option('-g, --gas', 'gas limit')
    .option('-r, --real', 'real')
    .action(async (filePath, cmdObj) => {
        if (!cmdObj.real) {
            Bouncer = getDeployedContract('GenesisBouncer');
        }
        let data;
        try {
            data = JSON.parse(fs.readFileSync(filePath).toString());
        } catch (e) {
            reportError(e);
            return;
        }
        let numAssets = 0;
        const assetsPerCreator = {};
        for (const assetData of data) {
            const creator = assetData.creator || assetData.sandbox.creator;
            if (!creator) {
                reportError('creator not found for asset\n' + JSON.stringify(assetData, null, '  '));
            }
            const assetList = assetsPerCreator[creator] || [];
            assetsPerCreator[creator] = assetList;
            const assetMetadata = {
                name: access(assetData, 'name'),
                description: access(assetData, 'description'),
                image: access(assetData, 'image'),
                animation_url: access(assetData, 'animation_url'),
                external_url: access(assetData, 'external_url'),
                properties: access(assetData, 'properties'), // TODO check values
                sandbox: {
                    creator: access(assetData.sandbox, 'creator'),
                    version: access(assetData.sandbox, 'version', (v) => v === 1),
                    asset_type: access(assetData.sandbox, 'asset_type'),
                    categories: access(assetData.sandbox, 'categories'),
                    preview2d: access(assetData.sandbox, 'preview2d'),
                    preview3d: access(assetData.sandbox, 'preview3d'),
                    voxel_model: access(assetData.sandbox, 'voxel_model'),
                    creator_profile_url: access(assetData.sandbox, 'creator_profile_url'),
                    asset_url: access(assetData.sandbox, 'asset_url', (v) => v === assetData.external_url),
                    // platform_policy: access(asset.sandbox, 'platform_policy', (v) => v === 'TODO'),
                },
                // license: {

                // }
            };
            assetList.push({
                metadata: assetMetadata,
                supply: access(assetData, 'supply'),
                rarity: access(assetData, 'rarity'),
            });
            numAssets++;
        }

        console.log(`${numAssets} assets across ${Object.keys(assetsPerCreator).length} creators ready to be processed`);

        const ipfsFoldersFolder = '__ipfs__';
        rimraf(ipfsFoldersFolder);
        fs.mkdirSync(ipfsFoldersFolder);
        const folderCreated = {};
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

            const cidv1 = 'bafybeih6rvyphidjoekzedidlmvpeeh4esobdpzu6475zdlddqre533ufq'; // TODO pin to ipfs
            const hash = hashFromCIDv1(cidv1);
            const owner = creator;
            const packId = 0;
            console.log({creator, packId, cidv1, hash, suppliesArr, raritiesPack, owner});
            // try {
            //     const receipt = await tx({from: operator, gas: cmdObj.gas || 1000000}, Bouncer, 'mintMultipleFor', creator, packId, hash, suppliesArr, raritiesPack, owner);
            //     console.log('success', {txHash: receipt.transactionHash, gasUsed: receipt.gasUsed});
            // } catch (e) {
            //     reportError(e);
            // }
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
