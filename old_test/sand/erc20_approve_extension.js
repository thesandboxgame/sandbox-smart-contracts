const tap = require('tap');
const assert = require('assert');
const rocketh = require('rocketh');
const {
    sandBeneficiary,
    others,
} = rocketh.namedAccounts;

const {
    gas,
    expectThrow,
    toChecksumAddress,
    deployContract,
    sendSignedTransaction,
    soliditySha3,
    ethSign,
    sendTransaction,
    tx,
    encodeCall,
} = require('../utils');

const {
    signEIP712Approval
} = require('../sand-utils');

const {
    transfer,
    transferFrom,
    getERC20Balance,
} = require('../erc20');

const user1 = toChecksumAddress(others[0]);
const user2 = toChecksumAddress(others[1]);
const user3 = toChecksumAddress(others[2]);

const signingAcount = {
    address: '0xFA8A6079E7B85d1be95B6f6DE1aAE903b6F40c00',
    privateKey: '0xeee5270a5c46e5b92510d70fa4d445a8cdd5010dde5b1fccc6a2bd1a9df8f5c0'
};

const otherSigner = {
    address: '0x75aE6abE03070a906d7a9d5C1607605DE73a0880',
    privateKey: '0x3c42a6c587e8a82474031cc06f1e6af7f5301bb2417b89d98eb3023d0ce659f6'
};

const approvalTypeHash = soliditySha3({type: 'string', value: 'Approve(address from,uint256 messageId,address target,uint256 amount)'});

function runERC20ApproveExtensionTests(title, resetContract) {
    // console.log('--> ', title);
    tap.test(title, async (t) => {
    // console.log(title);
        let contract;
        t.beforeEach(async () => {
            contract = await resetContract();
            await transfer(contract, signingAcount.address, '1000000', {from: sandBeneficiary, gas});
        });

        t.test('approveAndCall should fail if method call fails', async () => {
            const ERC20Fund = await deployContract(sandBeneficiary, 'ERC20Fund', contract.options.address);
            const callData = encodeCall(ERC20Fund, 'fail');
            await expectThrow(tx(contract, 'approveAndCall', {from: user1, gas}, ERC20Fund.options.address, 1000, callData));
        });

        t.test('approveAndCall should fail if allowance not enough', async () => {
            const ERC20Fund = await deployContract(sandBeneficiary, 'ERC20Fund', contract.options.address);
            const callData = encodeCall(ERC20Fund, 'take', user1, 10000);
            await expectThrow(tx(contract, 'approveAndCall', {from: user1, gas}, ERC20Fund.options.address, 1000, callData));
        });

        t.test('approveAndCall should fail if passing wrong sender in data', async () => {
            const ERC20Fund = await deployContract(sandBeneficiary, 'ERC20Fund', contract.options.address);
            const callData = encodeCall(ERC20Fund, 'take', user2, 10000);
            await expectThrow(tx(contract, 'approveAndCall', {from: user1, gas}, ERC20Fund.options.address, 10000, callData));
        });

        t.test('approveAndCall should fail if trying to call on behalf of someone else', async () => {
            const ERC20Fund = await deployContract(sandBeneficiary, 'ERC20Fund', contract.options.address);
            const callData = encodeCall(ERC20Fund, 'take', user1, 10000);
            await expectThrow(tx(contract, 'approveAndCall', {from: user2, gas}, ERC20Fund.options.address, 10000, callData));
        });

        t.test('approveAndCall', async () => {
            const ERC20Fund = await deployContract(sandBeneficiary, 'ERC20Fund', contract.options.address);
            const callData = encodeCall(ERC20Fund, 'take', user1, 100);
            await tx(contract, 'approveAndCall', {from: user1, gas}, ERC20Fund.options.address, 1000, callData);
            const user1Balance = await getERC20Balance(contract, user1);
            const ERC20FundBalance = await getERC20Balance(contract, ERC20Fund.options.address);
            assert.equal(ERC20FundBalance.toString(10), '100');
            assert.equal(user1Balance.toString(10), '999900');
        });

        t.test('approveViaBasicSignature fails if approved for someone else', async () => {
            const hash = soliditySha3(
                {type: 'address', value: contract.options.address},
                {type: 'bytes32', value: approvalTypeHash},
                {type: 'address', value: user1},
                {type: 'uint256', value: 1},
                {type: 'address', value: user3},
                {type: 'uint256', value: 10000},
            );
            const signature = await ethSign(hash, user1);
            await tx(contract, 'approveViaBasicSignature', {from: user2, gas}, user1, 1, user3, 10000, signature, false);
            await expectThrow(transferFrom(contract, user1, user2, 1000, {from: user2, gas}));
        });

        t.test('approveViaBasicSignature fails if wrong signature', async () => {
            const hash = soliditySha3(
                {type: 'address', value: contract.options.address},
                {type: 'bytes32', value: approvalTypeHash},
                {type: 'address', value: user1},
                {type: 'uint256', value: 1},
                {type: 'address', value: user2},
                {type: 'uint256', value: 1000},
            );
            const signature = await ethSign(hash, user1);
            await expectThrow(tx(contract, 'approveViaBasicSignature', {from: user2, gas}, user1, 1, user2, 10000, signature, false));
        });

        t.test('approveViaBasicSignature', async () => {
            const hash = soliditySha3(
                {type: 'address', value: contract.options.address},
                {type: 'bytes32', value: approvalTypeHash},
                {type: 'address', value: user1},
                {type: 'uint256', value: 1},
                {type: 'address', value: user2},
                {type: 'uint256', value: 10000},
            );
            const signature = await ethSign(hash, user1);
            await tx(contract, 'approveViaBasicSignature', {from: user2, gas}, user1, 1, user2, 10000, signature, false);
            await transferFrom(contract, user1, user2, 1000, {from: user2, gas});
            const user1Balance = await getERC20Balance(contract, user1);
            const user2Balance = await getERC20Balance(contract, user2);
            assert.equal(user2Balance.toString(10), '1000');
            assert.equal(user1Balance.toString(10), '999000');
        });

        t.test('approveViaBasicSignature fails if used second time', async () => {
            const hash = soliditySha3(
                {type: 'address', value: contract.options.address},
                {type: 'bytes32', value: approvalTypeHash},
                {type: 'address', value: user1},
                {type: 'uint256', value: 1},
                {type: 'address', value: user2},
                {type: 'uint256', value: 10000},
            );
            const signature = await ethSign(hash, user1);
            await tx(contract, 'approveViaBasicSignature', {from: user2, gas}, user1, 1, user2, 10000, signature, false);
            await expectThrow(tx(contract, 'approveViaBasicSignature', {from: user2, gas}, user1, 1, user2, 10000, signature, false));
        });

        t.test('approveViaBasicSignature fails if used after being revoked', async () => {
            const hash = soliditySha3(
                {type: 'address', value: contract.options.address},
                {type: 'bytes32', value: approvalTypeHash},
                {type: 'address', value: user1},
                {type: 'uint256', value: 1},
                {type: 'address', value: user2},
                {type: 'uint256', value: 10000},
            );
            const signature = await ethSign(hash, user1);
            await tx(contract, 'revokeApprovalMessage', {from: user1, gas}, 1);
            await expectThrow(tx(contract, 'approveViaBasicSignature', {from: user2, gas}, user1, 1, user2, 10000, signature, false));
        });

        t.test('approveViaBasicSignature on behalf of identity contract', async () => {
            const IdentityContract = await deployContract(sandBeneficiary, 'ERC1271Wallet', user1);
            await transfer(contract, IdentityContract.options.address, '1000000', {from: sandBeneficiary, gas});
            const hash = soliditySha3(
                {type: 'address', value: contract.options.address},
                {type: 'bytes32', value: approvalTypeHash},
                {type: 'address', value: IdentityContract.options.address},
                {type: 'uint256', value: 1},
                {type: 'address', value: user2},
                {type: 'uint256', value: 10000},
            );
            const signature = await ethSign(hash, user1);
            await tx(contract, 'approveViaBasicSignature', {from: user2, gas}, IdentityContract.options.address, 1, user2, 10000, signature, true);
            await transferFrom(contract, IdentityContract.options.address, user2, 1000, {from: user2, gas});
            const identityBalance = await getERC20Balance(contract, IdentityContract.options.address);
            const user2Balance = await getERC20Balance(contract, user2);
            assert.equal(user2Balance.toString(10), '1000');
            assert.equal(identityBalance.toString(10), '999000');
        });

        t.test('approveViaBasicSignature on behalf of identity contract fails if not approved', async () => {
            const IdentityContract = await deployContract(sandBeneficiary, 'ERC1271Wallet', user1);
            await transfer(contract, IdentityContract.options.address, '1000000', {from: sandBeneficiary, gas});
            const hash = soliditySha3(
                {type: 'address', value: contract.options.address},
                {type: 'bytes32', value: approvalTypeHash},
                {type: 'address', value: IdentityContract.options.address},
                {type: 'uint256', value: 1},
                {type: 'address', value: user2},
                {type: 'uint256', value: 10000},
            );
            const signature = await ethSign(hash, user3);
            await expectThrow(tx(contract, 'approveViaBasicSignature', {from: user2, gas}, IdentityContract.options.address, 1, user2, 10000, signature, true));
        });

        t.test('approveViaSignature', async () => {
            const signature = signEIP712Approval(signingAcount, contract.options.address, {messageId: 1, target: user2, amount: 10000});
            await tx(contract, 'approveViaSignature', {from: user2, gas}, signingAcount.address, 1, user2, 10000, signature, false);
            await transferFrom(contract, signingAcount.address, user2, 1000, {from: user2, gas});
            const user2Balance = await getERC20Balance(contract, user2);
            const signingUserBalance = await getERC20Balance(contract, signingAcount.address);
            assert.equal(signingUserBalance.toString(10), '999000');
            assert.equal(user2Balance.toString(10), '1000');
        });
        t.test('approveViaSignature fails if approved for someone else', async () => {
            const signature = signEIP712Approval(signingAcount, contract.options.address, {messageId: 1, target: user3, amount: 10000});
            await tx(contract, 'approveViaSignature', {from: user2, gas}, signingAcount.address, 1, user3, 10000, signature, false);
            await expectThrow(transferFrom(contract, signingAcount.address, user2, 1000, {from: user2, gas}));
        });
        t.test('approveViaSignature fails if not enough allowance', async () => {
            const signature = signEIP712Approval(signingAcount, contract.options.address, {messageId: 1, target: user2, amount: 1000});
            await tx(contract, 'approveViaSignature', {from: user2, gas}, signingAcount.address, 1, user2, 1000, signature, false);
            await expectThrow(transferFrom(contract, signingAcount.address, user2, 10000, {from: user2, gas}));
        });
        t.test('approveViaSignature fails if wrong signature', async () => {
            const signature = signEIP712Approval(signingAcount, contract.options.address, {messageId: 1, target: user2, amount: 1000});
            await expectThrow(tx(contract, 'approveViaSignature', {from: user2, gas}, signingAcount.address, 1, user2, 10000, signature, false));
        });

        t.test('approveViaSignature fails if used second time', async () => {
            const signature = signEIP712Approval(signingAcount, contract.options.address, {messageId: 1, target: user2, amount: 10000});
            await tx(contract, 'approveViaSignature', {from: user2, gas}, signingAcount.address, 1, user2, 10000, signature, false);
            await expectThrow(tx(contract, 'approveViaSignature', {from: user2, gas}, signingAcount.address, 1, user2, 10000, signature, false));
        });

        t.test('approveViaSignature fails if used after being revoked', async () => {
            await sendTransaction({from: sandBeneficiary, gas, to: signingAcount.address, value: 1000000000000000000}); // give some eth so signer can revoke
            const signature = signEIP712Approval(signingAcount, contract.options.address, {messageId: 1, target: user2, amount: 10000});
            const callData = encodeCall(contract, 'revokeApprovalMessage', 1);
            await sendSignedTransaction(callData, contract.options.address, signingAcount.privateKey);
            await expectThrow(tx(contract, 'approveViaSignature', {from: user2, gas}, signingAcount.address, 1, user2, 10000, signature, false));
        });

        t.test('approveViaSignature on behalf of identity contract', async () => {
            const IdentityContract = await deployContract(sandBeneficiary, 'ERC1271Wallet', otherSigner.address);
            await transfer(contract, IdentityContract.options.address, '1000000', {from: sandBeneficiary, gas});
            const signature = signEIP712Approval(otherSigner, contract.options.address, {messageId: 1, target: user2, amount: 10000, from: IdentityContract.options.address});
            await tx(contract, 'approveViaSignature', {from: user2, gas}, IdentityContract.options.address, 1, user2, 10000, signature, true);
            await transferFrom(contract, IdentityContract.options.address, user2, 1000, {from: user2, gas});
            const user2Balance = await getERC20Balance(contract, user2);
            const identityBalance = await getERC20Balance(contract, IdentityContract.options.address);
            assert.equal(identityBalance.toString(10), '999000');
            assert.equal(user2Balance.toString(10), '1000');
        });

        t.test('approveViaSignature on behalf of identity contract fails if not approved', async () => {
            const IdentityContract = await deployContract(sandBeneficiary, 'ERC1271Wallet', signingAcount.address);
            await transfer(contract, IdentityContract.options.address, '1000000', {from: sandBeneficiary, gas});
            const signature = signEIP712Approval(otherSigner, contract.options.address, {messageId: 1, target: user2, amount: 10000, from: IdentityContract.options.address});
            await expectThrow(tx(contract, 'approveViaSignature', {from: user2, gas}, IdentityContract.options.address, 1, user2, 10000, signature, true));
        });
    });
}

module.exports = {
    runERC20ApproveExtensionTests
};