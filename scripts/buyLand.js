const Web3 = require('web3');
const fs = require('fs');
const rocketh = require('rocketh');
const program = require('commander');
const {
    tx,
    call,
    getDeployedContract,
} = require('rocketh-web3')(rocketh, Web3);

const {
    emptyBytes,
    zeroAddress,
} = require('../test/utils')

const sender = rocketh.accounts[0];

program
    .command('buy <x> <y> <size>')
    .description('buy land from presale 1')
    .option('--gasPrice <gasPrice>', 'gasPrice to user')
    .option('-t, --test', 'test mode')
    .action(async (x, y, size, cmdObj) => {
        x = parseInt(x, 10);
        y = parseInt(y, 10);
        size = parseInt(size, 10);
        const landWithProofsData = fs.readFileSync('./.land_presale_proofs.json');
        const landWithProofs = JSON.parse(landWithProofsData);
        let landToBuy;
        for (const land of landWithProofs) {
            if (land.x === x && land.y === y && land.size === size) {
                landToBuy = land;
                break;
            }
        }
        if (!landToBuy) {
            console.error(`cannot find land ${x}, ${y}, ${size}`);
            process.exit(1);
        }
        if (!landToBuy.reserved) {
            landToBuy.reserved = zeroAddress;
        }

        const LandPreSale = getDeployedContract('LandPreSale_1');
        // const gasPrice = cmdObj.gasPrice;
        // console.log({
        //     preSale: LandPreSale.options.address,
        //     sender,
        //     gasPrice,
        //     land: landToBuy,
        // });
        console.log('PreSale Contract Address:');
        console.log(LandPreSale.options.address);
        console.log('------------------------------------------------');
        console.log('reserved:');
        console.log(landToBuy.reserved);
        console.log('x:');
        console.log(landToBuy.x);
        console.log('y:');
        console.log(landToBuy.y);
        console.log('size:');
        console.log(landToBuy.size);
        console.log('price:');
        console.log(landToBuy.price);
        console.log('salt:');
        console.log(landToBuy.salt);
        console.log('proof:');
        console.log(JSON.stringify(landToBuy.proof));

        // if (!cmdObj.test) {
        //     const receipt = await tx({from: sender, gas: 1000000, gasPrice}, LandPreSale, 'buyLandWithETH', sender, destination);
        //     console.log(receipt);
        // } else {
        //     console.log('was for test only');
        // }
    });

program.parse(process.argv);
