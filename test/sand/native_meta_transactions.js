const tap = require('tap');
const assert = require('assert');
const BN = require('bn.js');

const rocketh = require('rocketh');
const {
    deployer,
    sandBeneficiary,
    others,
} = rocketh.namedAccounts;

const zeroAddress = '0x0000000000000000000000000000000000000000';

const {
    gas,
    expectThrow,
    toChecksumAddress,
    deployContract,
    encodeEventSignature,
} = require('../utils');

const {
    executeMetaTx,
    executeMetaTxViaBasicSignature,
} = require('../sand-utils');

const {
    transfer,
    getERC20Balance,
} = require('../erc20');

const user1 = toChecksumAddress(others[0]);
const user2 = toChecksumAddress(others[1]);
const user3 = toChecksumAddress(others[2]);
const executor = toChecksumAddress(others[3]);

const MetaTxEvent = encodeEventSignature('MetaTx(address,uint256,bool)');

const signingAcount = {
    address: '0xFA8A6079E7B85d1be95B6f6DE1aAE903b6F40c00',
    privateKey: '0xeee5270a5c46e5b92510d70fa4d445a8cdd5010dde5b1fccc6a2bd1a9df8f5c0'
};

const otherSigner = {
    address: '0x75aE6abE03070a906d7a9d5C1607605DE73a0880',
    privateKey: '0x3c42a6c587e8a82474031cc06f1e6af7f5301bb2417b89d98eb3023d0ce659f6'
};

function runMetaTxExtensionTests(title, deployMetaTxTokenContracts) {
    tap.test('META TX : ' + title, async (t) => {
        // t.runOnly = true;
        const initialSand = new BN('1000000000000000000000000');
        let contract;
        let metatxProcessor;
        let receiverContract;
        t.beforeEach(async () => {
            const contracts = await deployMetaTxTokenContracts();
            contract = contracts.tokenContract;
            metatxProcessor = contracts.metatxProcessor;
            if (!metatxProcessor) {
                metatxProcessor = contract;
            }

            receiverContract = await deployContract(deployer, 'ERC20MetaTxReceiver', contract.options.address, 150);
            await transfer(contract, signingAcount.address, initialSand.toString(10), {from: sandBeneficiary, gas});
            // console.log('balance ', (await getERC20Balance(contract, signingAcount.address)).toString(10));
        });

        t.test('executeMetaTx simple transfer', async () => {
            const receipt = await executeMetaTx(signingAcount,
                metatxProcessor,
                {from: executor, gas, gasPrice: 1},
                {nonce: 1, minGasPrice: 1, txGas: 2000000, baseGas: 112000, tokenGasPrice: 1, relayer: zeroAddress, tokenDeposit: executor},
                user2,
                150);

            const signerBalance = await getERC20Balance(contract, signingAcount.address);
            const user2Balance = await getERC20Balance(contract, user2);

            const tokenSpentForGas = new BN(37941);
            const expectedSandLeftForSigner = initialSand.sub(new BN('150')).sub(tokenSpentForGas);
            assert.ok(signerBalance, expectedSandLeftForSigner, 1000);
            assert.equal(user2Balance.toString(10), '150');
        });

        t.test('executeMetaTx simple transfer fail if wrong signature', async () => {
            await expectThrow(executeMetaTx(signingAcount,
                metatxProcessor,
                {from: executor, gas, gasPrice: 1},
                {fakeSig: true, nonce: 1, minGasPrice: 1, txGas: 2000000, baseGas: 112000, tokenGasPrice: 1, relayer: zeroAddress, tokenDeposit: executor},
                user2,
                150));
        });

        t.test('executeMetaTx simple transfer via basic signature', async () => {
            await transfer(contract, user1, new BN('1000000000000000000000000').toString(10), {from: sandBeneficiary, gas});
            const user1InitialSand = await getERC20Balance(contract, user1);
            const receipt = await executeMetaTxViaBasicSignature(
                user1,
                metatxProcessor,
                {from: executor, gas, gasPrice: 1},
                {nonce: 1, minGasPrice: 1, txGas: 2000000, baseGas: 112000, tokenGasPrice: 1, relayer: zeroAddress, tokenDeposit: executor},
                user2,
                150);

            const user1Balance = await getERC20Balance(contract, signingAcount.address);
            const user2Balance = await getERC20Balance(contract, user2);

            const tokenSpentForGas = new BN(37941);
            const expectedSandLeftForUser1 = user1InitialSand.sub(new BN('150')).sub(tokenSpentForGas);
            assert.ok(user1Balance, expectedSandLeftForUser1, 1000);
            assert.equal(user2Balance.toString(10), '150');
        });

        t.test('executeMetaTx simple transfer via basic signature fails if wrong signature', async () => {
            await transfer(contract, user1, new BN('1000000000000000000000000').toString(10), {from: sandBeneficiary, gas});
            await expectThrow(executeMetaTxViaBasicSignature(
                user1,
                metatxProcessor,
                {from: executor, gas, gasPrice: 1},
                {fakeSig: true, nonce: 1, minGasPrice: 1, txGas: 2000000, baseGas: 112000, tokenGasPrice: 1, relayer: zeroAddress, tokenDeposit: executor},
                user2,
                150));
        });

        t.test('executeMetaTx simple transfer via 1271 identity contract', async () => {
            const IdentityContract = await deployContract(deployer, 'ERC1271Wallet', signingAcount.address);
            const identityAddress = IdentityContract.options.address;
            await transfer(contract, identityAddress, initialSand.toString(10), {from: sandBeneficiary, gas});
            const receipt = await executeMetaTx(signingAcount,
                metatxProcessor,
                {from: executor, gas, gasPrice: 1},
                {from: identityAddress, nonce: 1, minGasPrice: 1, txGas: 2000000, baseGas: 112000, tokenGasPrice: 1, relayer: zeroAddress, tokenDeposit: executor, signatureType: 2},
                user2,
                150);

            const identityBalance = await getERC20Balance(contract, identityAddress);
            const user2Balance = await getERC20Balance(contract, user2);

            const tokenSpentForGas = new BN(37941);
            const expectedSandLeftForIdentity = initialSand.sub(new BN('150')).sub(tokenSpentForGas);
            assert.ok(identityBalance, expectedSandLeftForIdentity, 1000);
            assert.equal(user2Balance.toString(10), '150');
        });

        t.test('executeMetaTx simple transfer via 1271 identity contract fails when sending to 1654 wallet', async () => {
            const IdentityContract = await deployContract(deployer, 'ERC1654Wallet', signingAcount.address);
            const identityAddress = IdentityContract.options.address;
            await transfer(contract, identityAddress, initialSand.toString(10), {from: sandBeneficiary, gas});
            await expectThrow(executeMetaTx(signingAcount,
                metatxProcessor,
                {from: executor, gas, gasPrice: 1},
                {from: identityAddress, nonce: 1, minGasPrice: 1, txGas: 2000000, baseGas: 112000, tokenGasPrice: 1, relayer: zeroAddress, tokenDeposit: executor, signatureType: 2},
                user2,
                150));
        });

        t.test('executeMetaTx simple transfer via 1654 identity contract fails when sending to 1271 wallet', async () => {
            const IdentityContract = await deployContract(deployer, 'ERC1271Wallet', signingAcount.address);
            const identityAddress = IdentityContract.options.address;
            await transfer(contract, identityAddress, initialSand.toString(10), {from: sandBeneficiary, gas});
            await expectThrow(executeMetaTx(signingAcount,
                metatxProcessor,
                {from: executor, gas, gasPrice: 1},
                {from: identityAddress, nonce: 1, minGasPrice: 1, txGas: 2000000, baseGas: 112000, tokenGasPrice: 1, relayer: zeroAddress, tokenDeposit: executor, signatureType: 1},
                user2,
                150));
        });

        t.test('executeMetaTx simple transfer via 1271 identity contract fails when not approved', async () => {
            const IdentityContract = await deployContract(deployer, 'ERC1271Wallet', otherSigner.address);
            const identityAddress = IdentityContract.options.address;
            await transfer(contract, identityAddress, initialSand.toString(10), {from: sandBeneficiary, gas});
            await expectThrow(executeMetaTx(signingAcount,
                metatxProcessor,
                {from: executor, gas, gasPrice: 1},
                {from: identityAddress, nonce: 1, minGasPrice: 1, txGas: 2000000, baseGas: 112000, tokenGasPrice: 1, relayer: zeroAddress, tokenDeposit: executor, signatureType: 2},
                user2,
                150));
        });

        t.test('executeMetaTx simple transfer via 1654 identity contract', async () => {
            const IdentityContract = await deployContract(deployer, 'ERC1654Wallet', signingAcount.address);
            const identityAddress = IdentityContract.options.address;
            await transfer(contract, identityAddress, initialSand.toString(10), {from: sandBeneficiary, gas});
            const receipt = await executeMetaTx(signingAcount,
                metatxProcessor,
                {from: executor, gas, gasPrice: 1},
                {from: identityAddress, nonce: 1, minGasPrice: 1, txGas: 2000000, baseGas: 112000, tokenGasPrice: 1, relayer: zeroAddress, tokenDeposit: executor, signatureType: 1},
                user2,
                150);

            const identityBalance = await getERC20Balance(contract, identityAddress);
            const user2Balance = await getERC20Balance(contract, user2);

            const tokenSpentForGas = new BN(37941);
            const expectedSandLeftForIdentity = initialSand.sub(new BN('150')).sub(tokenSpentForGas);
            assert.ok(identityBalance, expectedSandLeftForIdentity, 1000);
            assert.equal(user2Balance.toString(10), '150');
        });

        t.test('executeMetaTx simple transfer via 1654 identity contract fails when not approved', async () => {
            const IdentityContract = await deployContract(deployer, 'ERC1654Wallet', otherSigner.address);
            const identityAddress = IdentityContract.options.address;
            await transfer(contract, identityAddress, initialSand.toString(10), {from: sandBeneficiary, gas});
            await expectThrow(executeMetaTx(signingAcount,
                metatxProcessor,
                {from: executor, gas, gasPrice: 1},
                {from: identityAddress, nonce: 1, minGasPrice: 1, txGas: 2000000, baseGas: 112000, tokenGasPrice: 1, relayer: zeroAddress, tokenDeposit: executor, signatureType: 1},
                user2,
                150));
        });

        t.test('executeMetaTx simple transfer via 1271 identity contract fails when wrong sig', async () => {
            const IdentityContract = await deployContract(deployer, 'ERC1271Wallet', signingAcount.address);
            const identityAddress = IdentityContract.options.address;
            await transfer(contract, identityAddress, initialSand.toString(10), {from: sandBeneficiary, gas});
            await expectThrow(executeMetaTx(signingAcount,
                metatxProcessor,
                {from: executor, gas, gasPrice: 1},
                {fakeSig: true, from: identityAddress, nonce: 1, minGasPrice: 1, txGas: 2000000, baseGas: 112000, tokenGasPrice: 1, relayer: zeroAddress, tokenDeposit: executor, signatureType: 2},
                user2,
                150));
        });

        // if(use777) {
        //   // TODO allow
        //   return;
        // }
        t.test('executeMetaTx transfer and call', async () => {
            const receiverAddress = receiverContract.options.address;
            const receipt = await executeMetaTx(signingAcount,
                metatxProcessor,
                {from: executor, gas, gasPrice: 1},
                {nonce: 1, minGasPrice: 1, txGas: 2000000, baseGas: 112000, tokenGasPrice: 1, relayer: zeroAddress, tokenDeposit: executor},
                receiverContract,
                150,
                'receiveMeta', signingAcount.address, 150, 'test', 111);

            // console.log(JSON.stringify(receipt, null, '  '));

            const signerBalance = await getERC20Balance(contract, signingAcount.address);
            const receiverBalance = await getERC20Balance(contract, receiverAddress);

            const tokenSpentForGas = new BN(37658);
            const expectedSandLeftForSigner = initialSand.sub(new BN('150')).sub(tokenSpentForGas);
            assert.ok(signerBalance, expectedSandLeftForSigner, 1000);
            assert.equal(receiverBalance.toString(10), '150');
        });

        t.test('executeMetaTx transfer and call will result in fail inner call if trying to transfer more than signed', async () => {
            const receiverAddress = receiverContract.options.address;
            const receipt = await executeMetaTx(signingAcount,
                metatxProcessor,
                {from: executor, gas, gasPrice: 1},
                {nonce: 1, minGasPrice: 1, txGas: 2000000, baseGas: 112000, tokenGasPrice: 1, relayer: zeroAddress, tokenDeposit: executor},
                receiverContract,
                150,
                'receiveMeta', signingAcount.address, 150 + 1, 'test', 111);

            const receiverBalance = await getERC20Balance(contract, receiverAddress);
            assert.equal(receiverBalance.toString(10), '0');
        });

        t.test('executeMetaTx transfer and call via basic signature', async () => {
            await transfer(contract, user1, new BN('1000000000000000000000000').toString(10), {from: sandBeneficiary, gas});
            const user1InitialSand = await getERC20Balance(contract, user1);
            const receiverAddress = receiverContract.options.address;
            const receipt = await executeMetaTxViaBasicSignature(
                user1,
                metatxProcessor,
                {from: executor, gas, gasPrice: 1},
                {nonce: 1, minGasPrice: 1, txGas: 2000000, baseGas: 112000, tokenGasPrice: 1, relayer: zeroAddress, tokenDeposit: executor},
                receiverContract,
                150,
                'receiveMeta', user1, 150, 'test', 111);

            const user1Balance = await getERC20Balance(contract, signingAcount.address);
            const receiverBalance = await getERC20Balance(contract, receiverAddress);

            const tokenSpentForGas = new BN(37941);
            const expectedSandLeftForUser1 = user1InitialSand.sub(new BN('150')).sub(tokenSpentForGas);
            assert.ok(user1Balance, expectedSandLeftForUser1, 1000);
            assert.equal(receiverBalance.toString(10), '150');
        });

        t.test('executeMetaTx transfer and call via basic signature and 1271 identity contract', async () => {
            const receiverAddress = receiverContract.options.address;
            const IdentityContract = await deployContract(deployer, 'ERC1271Wallet', user1);
            const identityAddress = IdentityContract.options.address;
            await transfer(contract, identityAddress, initialSand.toString(10), {from: sandBeneficiary, gas});
            const identityInitialSand = await getERC20Balance(contract, user1);
            const receipt = await executeMetaTxViaBasicSignature(
                user1,
                metatxProcessor,
                {from: executor, gas, gasPrice: 1},
                {from: identityAddress, nonce: 1, minGasPrice: 1, txGas: 2000000, baseGas: 112000, tokenGasPrice: 1, relayer: zeroAddress, tokenDeposit: executor, signatureType: 2},
                receiverContract,
                150,
                'receiveMeta', identityAddress, 150, 'test', 111);

            const identityBalance = await getERC20Balance(contract, identityAddress);
            const receiverBalance = await getERC20Balance(contract, receiverAddress);

            const tokenSpentForGas = new BN(37941);
            const expectedSandLeftForIdentity = identityInitialSand.sub(new BN('150')).sub(tokenSpentForGas);
            assert.ok(identityBalance, expectedSandLeftForIdentity, 1000);
            assert.equal(receiverBalance.toString(10), '150');
        });

        t.test('executeMetaTx transfer and call via basic signature and 1271 identity contract fails if not approved', async () => {
            const receiverAddress = receiverContract.options.address;
            const IdentityContract = await deployContract(deployer, 'ERC1271Wallet', user3);
            const identityAddress = IdentityContract.options.address;
            await transfer(contract, identityAddress, initialSand.toString(10), {from: sandBeneficiary, gas});
            const identityInitialSand = await getERC20Balance(contract, user1);
            await expectThrow(executeMetaTxViaBasicSignature(
                user1,
                metatxProcessor,
                {from: executor, gas, gasPrice: 1},
                {from: identityAddress, nonce: 1, minGasPrice: 1, txGas: 2000000, baseGas: 112000, tokenGasPrice: 1, relayer: zeroAddress, tokenDeposit: executor, signatureType: 2},
                receiverContract,
                150,
                'receiveMeta', user1, 150, 'test', 111));
        });

        t.test('executeMetaTx transfer and call via 1271 identity contract', async () => {
            const receiverAddress = receiverContract.options.address;
            const IdentityContract = await deployContract(deployer, 'ERC1271Wallet', signingAcount.address);
            const identityAddress = IdentityContract.options.address;
            await transfer(contract, identityAddress, initialSand.toString(10), {from: sandBeneficiary, gas});
            await executeMetaTx(signingAcount,
                metatxProcessor,
                {from: executor, gas, gasPrice: 1},
                {from: identityAddress, nonce: 1, minGasPrice: 1, txGas: 2000000, baseGas: 112000, tokenGasPrice: 1, relayer: zeroAddress, tokenDeposit: executor, signatureType: 2},
                receiverContract,
                150,
                'receiveMeta', identityAddress, 150, 'test', 111); // address does not matter here

            const identityBalance = await getERC20Balance(contract, identityAddress);
            const receiverBalance = await getERC20Balance(contract, receiverAddress);

            const tokenSpentForGas = new BN(37658);
            const expectedSandLeftForIdentity = initialSand.sub(new BN('150')).sub(tokenSpentForGas);
            assert.ok(identityBalance, expectedSandLeftForIdentity, 1000);
            assert.equal(receiverBalance.toString(10), '150');
        });

        t.test('executeMetaTx transfer and call via 1271 identity contract fail inner call if trying to transfer more than signed', async () => {
            const receiverAddress = receiverContract.options.address;
            const IdentityContract = await deployContract(deployer, 'ERC1271Wallet', signingAcount.address);
            const identityAddress = IdentityContract.options.address;
            await transfer(contract, identityAddress, initialSand.toString(10), {from: sandBeneficiary, gas});
            await executeMetaTx(signingAcount,
                metatxProcessor,
                {from: executor, gas, gasPrice: 1},
                {from: identityAddress, nonce: 1, minGasPrice: 1, txGas: 2000000, baseGas: 112000, tokenGasPrice: 1, relayer: zeroAddress, tokenDeposit: executor, signatureType: 2},
                receiverContract,
                150,
                'receiveMeta', identityAddress, 150 + 1, 'test', 111); // address does not matter here

            const receiverBalance = await getERC20Balance(contract, receiverAddress);
            assert.equal(receiverBalance.toString(10), '0');
        });

        t.test('executeMetaTx transfer and call via 1271 identity contract fails if not approved', async () => {
            const receiverAddress = receiverContract.options.address;
            const IdentityContract = await deployContract(deployer, 'ERC1271Wallet', otherSigner.address);
            const identityAddress = IdentityContract.options.address;
            await transfer(contract, identityAddress, initialSand.toString(10), {from: sandBeneficiary, gas});
            await expectThrow(executeMetaTx(signingAcount,
                metatxProcessor,
                {from: executor, gas, gasPrice: 1},
                {from: identityAddress, nonce: 1, minGasPrice: 1, txGas: 2000000, baseGas: 112000, tokenGasPrice: 1, relayer: zeroAddress, tokenDeposit: executor, signatureType: 2},
                receiverContract,
                150,
                'receiveMeta', signingAcount.address, 150, 'test', 111)); // address does not matter here
        });

        t.test('executeMetaTx transfer and call GasDrain', async () => {
            const txGas = 5000000;
            const gasProvided = txGas + 900000;
            const GasDrain = await deployContract(deployer, 'GasDrain');
            const receiverAddress = GasDrain.options.address;
            const receipt = await executeMetaTx(signingAcount,
                metatxProcessor,
                {from: executor, gas: gasProvided, gasPrice: 1},
                {nonce: 1, minGasPrice: 1, txGas, baseGas: 112000, tokenGasPrice: 1, relayer: zeroAddress, tokenDeposit: executor},
                GasDrain,
                150,
                'receiveSpecificERC20', signingAcount.address, 150, txGas);

            // console.log(JSON.stringify(receipt, null, '  '));
        });

        t.test('executing with not enough gas should result in the relayer\'s tx failing', async () => {
            const GasDrain = await deployContract(deployer, 'GasDrain');
            const txGas = 5000000;
            const gasProvided = txGas + 112000;
            const baseGas = 112000;

            await expectThrow(executeMetaTx(signingAcount,
                metatxProcessor,
                {from: executor, gas: gasProvided, gasPrice: 1},
                {nonce: 1, minGasPrice: 1, txGas, baseGas, tokenGasPrice: 1, relayer: zeroAddress, tokenDeposit: executor},
                GasDrain,
                150,
                'receiveSpecificERC20', signingAcount.address, 150, txGas));
        });

        t.test('executing with just NOT enough gas should result in the relayer\'s tx failing', async () => {
            const GasDrain = await deployContract(deployer, 'GasDrain');
            const txGas = 5000000;
            const gasProvided = Math.floor((txGas * 64) / 63) + 112000 + 57690; // approximatively
            const baseGas = 112000;
            // console.log('gasProvided', gasProvided);

            await expectThrow(executeMetaTx(signingAcount,
                metatxProcessor,
                {from: executor, gas: gasProvided, gasPrice: 1},
                {nonce: 1, minGasPrice: 1, txGas, baseGas, tokenGasPrice: 1, relayer: zeroAddress, tokenDeposit: executor},
                GasDrain,
                150,
                'receiveSpecificERC20', signingAcount.address, 150, txGas));
        });

    // t.only('executing with just enough gas should result in the meta tx success', async() => {
    //   const GasDrain = await deployContract(deployer, 'GasDrain');
    //   const txGas = 5000000;
    //   const gasProvided = Math.floor((txGas * 64) / 63) + 112000 + 56800;
    //   const baseGas = 112000;
    //   console.log('gasProvided', gasProvided);

    //   await transfer(contract, executor, 1, {from: sandBeneficiary, gas}); // TO ENSURE NO 20000 storage cost

    //   const receipt = await executeMetaTx(signingAcount,
    //     metatxProcessor,
    //     {from:executor, gas: gasProvided, gasPrice:1},
    //     {nonce:1, gasPrice:1, txGas, baseGas, tokenGasPrice:1, relayer: zeroAddress, tokenDeposit: executor},
    //     GasDrain,
    //     150,
    //     'receiveSpecificERC20', signingAcount.address, 150, txGas);

    //   const events = await getEventsFromReceipt(contract, MetaTxEvent, receipt);
    //   assert.equal(events.length, 1);
    //   const metaTxEvent = events[0].returnValues;
    //   assert(metaTxEvent[2]);

    //   console.log(receipt.gasUsed);
    //   console.log(JSON.stringify(receipt,null, '  '));
    // });
    });
}

module.exports = {
    runMetaTxExtensionTests
};