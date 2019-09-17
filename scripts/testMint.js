const base32 = require('base32.js');
const Web3 = require('web3');
const rocketh = require('rocketh');
const program = require('commander');
const {
    getDeployedContract,
    tx,
} = require('rocketh-web3')(rocketh, Web3);

const Bouncer = getDeployedContract('TestBouncer');

const operator = rocketh.accounts[0];

function hashFromCIDv1(cidv1) {
    const decoder = new base32.Decoder();
    const binary = decoder.write(cidv1.substr(1)).finalize().toString('hex');
    return '0x' + binary.substr(8);
}

program
    .command('mintFor <creator> <packId> <cidv1> <supply> <rarity> <owner>')
    .option('-g, --gas', 'gas limit')
    .description('mint one type')
    .action(async (creator, packId, cidv1, supply, rarity, owner, cmdObj) => {
        // const cidv1 = 'bafybeih6rvyphidjoekzedidlmvpeeh4esobdpzu6475zdlddqre533ufq';
        const hash = hashFromCIDv1(cidv1);

        console.log({creator, packId, cidv1, hash, supply, rarity, owner, cmdObj});
        try {
            const receipt = await tx({from: operator, gas: cmdObj.gas || 1000000}, Bouncer, 'mintFor', creator, packId, hash, supply, rarity, owner);
            console.log('success', {txHash: receipt.transactionHash, gasUsed: receipt.gasUsed});
        } catch (e) {
            console.error(e);
        }
    });

program
    .command('mintMultipleFor <creator> <packId> <cidv1> <supplies> <rarities> <owner>')
    .option('-g, --gas', 'gas limit')
    .description('mint multiple type at once')
    .action(async (creator, packId, cidv1, supplies, rarities, owner, cmdObj) => {
        const hash = hashFromCIDv1(cidv1);
        const suppliesArr = supplies.split(',');
        const raritiesArr = rarities.split(',');
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

        console.log({creator, packId, cidv1, hash, suppliesArr, raritiesPack, owner});
        try {
            const receipt = await tx({from: operator, gas: cmdObj.gas || 1000000}, Bouncer, 'mintMultipleFor', creator, packId, hash, suppliesArr, raritiesPack, owner);
            console.log('success', {txHash: receipt.transactionHash, gasUsed: receipt.gasUsed});
        } catch (e) {
            console.error(e);
        }
    });

program.parse(process.argv);
