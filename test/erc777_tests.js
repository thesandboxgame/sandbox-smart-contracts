const tap = require('tap');
const assert = require('assert');
const BN = require('bn.js');
const rocketh = require('rocketh');
const accounts = rocketh.accounts;

const {
    gas,
    expectThrow,
    getEventsFromReceipt,
    getPastEvents,
    toChecksumAddress,
    encodeEventSignature,
    deployContract,
    emptyBytes,
    zeroAddress,
    tx,
    call,
    encodeCall,
    instantiateContract,
  } = require('./utils');

const {
    getERC20Balance,
    transfer,
    approve,
} = require('./erc20');

const {
    AuthorizedOperatorEvent,
    RevokedOperatorEvent,
    BurnedEvent,
    MintedEvent,
    SentEvent,
    authorizeOperator,
    revokeOperator,
    isOperatorFor,
    send,
    operatorSend
} = require('./erc777');

const creator = toChecksumAddress(accounts[0]);
const sandOwner = creator;
const user1 = toChecksumAddress(accounts[1]);
const user2 = toChecksumAddress(accounts[2]);
const operator = toChecksumAddress(accounts[4]);

function runERC777Tests(title, resetContract) {
    tap.test(title, async (t) => {
        let contract;
        t.beforeEach(async () => {
            contract = await resetContract();
        });
    
        t.test('sending from user1 to user2 should adjust their balance accordingly', async () => {
            await send(contract, user2, '1000', emptyBytes, {from: user1, gas});
            const user1Balance = await getERC20Balance(contract, user1);
            const user2Balance = await getERC20Balance(contract, user2);
            assert.equal(user2Balance.toString(10), '1000');
            assert.equal(user1Balance.toString(10), '999000');
        });
        t.test('sending from user1 more token that it owns should fails', async () => {
            await expectThrow(send(contract, user2, '2000000', emptyBytes, {from: user1, gas}));
        });
        t.test('sending from user1 by user2 should fails', async () => {
            await expectThrow(operatorSend(contract, user1, user2, '1000', emptyBytes, emptyBytes, {from: user2, gas}));
        });
    
        t.test('sending from user1 to user2 should trigger a Sent event', async () => {
            const receipt = await send(contract, user2, '1000', emptyBytes, {from: user1, gas});
            const events = await getEventsFromReceipt(contract, SentEvent, receipt);
            assert.equal(events[0].returnValues[3], '1000');
        });
    
        t.test('sending (erc777) from user1 to user2 by operator after erc20 approval, should fails', async () => {
            await approve(contract, operator, '1000', {from: user1, gas});
            await expectThrow(operatorSend(contract, user1, user2, '1000', emptyBytes, emptyBytes, {from: operator, gas}));
        });
        t.test('sending from user1 to user2 by operator after authorization, should adjust the balances accordingly', async () => {
            await authorizeOperator(contract, operator, {from: user1, gas});
            await operatorSend(contract, user1, user2, '1000', emptyBytes, emptyBytes, {from: operator, gas});
            const user1Balance = await getERC20Balance(contract, user1);
            const user2Balance = await getERC20Balance(contract, user2);
            assert.equal(user2Balance.toString(10), '1000');
            assert.equal(user1Balance.toString(10), '999000');
        });
        t.test('sending from user1 by operators without pre-authorization should fails', async () => {
            await expectThrow(operatorSend(contract, user1, user2, '1000', emptyBytes, emptyBytes, {from: operator, gas}));
        });
    
        t.test('sending from user1 by operators with authorization and then revokation should fails', async () => {
            await authorizeOperator(contract, operator, {from: user1, gas});
            await revokeOperator(contract, operator, {from: user1, gas});
            await expectThrow(operatorSend(contract, user1, user2, '1000', emptyBytes, emptyBytes, {from: operator, gas}));
        });
    
        t.test('authorizing operator should trigger a AuthorizeOperator event', async () => {
            const receipt = await authorizeOperator(contract, operator, {from: user1, gas});
            const events = await getEventsFromReceipt(contract, AuthorizedOperatorEvent, receipt);
            assert.equal(events[0].returnValues[0], operator);
        });
    
        t.test('sending to contract should fail if contract does not implement tokensReceived', async () => {
            const ERC20Fund = await deployContract(creator, 'ERC20Fund', contract.options.address);
            await expectThrow(send(contract, ERC20Fund.options.address, '1000', emptyBytes, {from: user1, gas}));
        });
    
        t.test('sending to contract should succeed if contract implements tokensReceived and accept', async () => {
            const Sand777Receiver = await deployContract(creator, 'Sand777Receiver', contract.options.address, true);
            await send(contract, Sand777Receiver.options.address, '1000', emptyBytes, {from: user1, gas});
            const user1Balance = await getERC20Balance(contract, user1);
            const sand777ReceiverBalance = await getERC20Balance(contract, Sand777Receiver.options.address);
            assert.equal(sand777ReceiverBalance.toString(10), '1000');
            assert.equal(user1Balance.toString(10), '999000');
        });
    
        t.test('sending to contract should fails if contract implements tokensReceived and reject', async () => {
            const Sand777Receiver = await deployContract(creator, 'Sand777Receiver', contract.options.address, false);
            await expectThrow(send(contract, Sand777Receiver.options.address, '1000', emptyBytes, {from: user1, gas}));
        });
    
        t.test('transfering (erc20) to contract should fails if contract implements tokensReceived and reject', async () => {
            const Sand777Receiver = await deployContract(creator, 'Sand777Receiver', contract.options.address, false);
            await expectThrow(transfer(contract, Sand777Receiver.options.address, '1000', {from: user1, gas}));
        });
    
        t.test('transfering (erc20) to contract should NOT fail if contract does not implement tokensReceived', async () => {
            const ERC20Fund = await deployContract(creator, 'ERC20Fund', contract.options.address);
            await transfer(contract, ERC20Fund.options.address, '1000', {from: user1, gas});
            const user1Balance = await getERC20Balance(contract, user1);
            const ERC20FundReceiverBalance = await getERC20Balance(contract, ERC20Fund.options.address);
            assert.equal(ERC20FundReceiverBalance.toString(10), '1000');
            assert.equal(user1Balance.toString(10), '999000');
        });
    
        t.test('transfering (erc20) to contract should succeed if contract implements tokensReceived and accept', async () => {
            const Sand777Receiver = await deployContract(creator, 'Sand777Receiver', contract.options.address, true);
            await transfer(contract, Sand777Receiver.options.address, '1000', {from: user1, gas});
            const user1Balance = await getERC20Balance(contract, user1);
            const sand777ReceiverBalance = await getERC20Balance(contract, Sand777Receiver.options.address);
            assert.equal(sand777ReceiverBalance.toString(10), '1000');
            assert.equal(user1Balance.toString(10), '999000');
        });
    
        t.test('sending from contract should NOT fail if contract does not implement tokensToSend', async () => {
            const Sand777Receiver = await deployContract(creator, 'Sand777Receiver', contract.options.address, true);
            await send(contract, Sand777Receiver.options.address, '1000', emptyBytes, {from: user1, gas});
            await tx(Sand777Receiver, 'send', {from: user1, gas}, user1, '100');
            const user1Balance = await getERC20Balance(contract, user1);
            const sand777ReceiverBalance = await getERC20Balance(contract, Sand777Receiver.options.address);
            assert.equal(sand777ReceiverBalance.toString(10), '900');
            assert.equal(user1Balance.toString(10), '999100');
        });
    
        t.test('sending from contract should succeed if contract implements tokensToSend and accept', async () => {
            const Sand777Sender = await deployContract(creator, 'Sand777Sender', contract.options.address, true);
            await send(contract, Sand777Sender.options.address, '1000', emptyBytes, {from: user1, gas});
            await tx(Sand777Sender, 'send', {from: user1, gas}, user1, '100');
            const user1Balance = await getERC20Balance(contract, user1);
            const sand777SenderBalance = await getERC20Balance(contract, Sand777Sender.options.address);
            assert.equal(sand777SenderBalance.toString(10), '900');
            assert.equal(user1Balance.toString(10), '999100');
        });
    
        t.test('sending from contract should fails if contract implements tokensToSend and reject', async () => {
            const Sand777Sender = await deployContract(creator, 'Sand777Sender', contract.options.address, false);
            await send(contract, Sand777Sender.options.address, '1000', emptyBytes, {from: user1, gas});
            await expectThrow(tx(Sand777Sender, 'send', {from: user1, gas}, user1, '100'));
        });
    
        t.test('transfering (erc20) from contract should fails if contract implements tokensToSend and reject', async () => {
            const Sand777Sender = await deployContract(creator, 'Sand777Sender', contract.options.address, false);
            await send(contract, Sand777Sender.options.address, '1000', emptyBytes, {from: user1, gas});
            await expectThrow(tx(Sand777Sender, 'transfer', {from: user1, gas}, user1, '100'));
        });
    
        t.test('transfering (erc20) from contract should NOT fail if contract does not implement tokensToSend', async () => {
            const Sand777Receiver = await deployContract(creator, 'Sand777Receiver', contract.options.address, true);
            await send(contract, Sand777Receiver.options.address, '1000', emptyBytes, {from: user1, gas});
            await tx(Sand777Receiver, 'transfer', {from: user1, gas}, user1, '100');
            const user1Balance = await getERC20Balance(contract, user1);
            const sand777ReceiverBalance = await getERC20Balance(contract, Sand777Receiver.options.address);
            assert.equal(sand777ReceiverBalance.toString(10), '900');
            assert.equal(user1Balance.toString(10), '999100');
        });
  
        t.test('transfering (erc20) from contract should succeed if contract implements tokensToSend and accept', async () => {
            const Sand777Sender = await deployContract(creator, 'Sand777Sender', contract.options.address, true);
            await send(contract, Sand777Sender.options.address, '1000', emptyBytes, {from: user1, gas});
            await tx(Sand777Sender, 'transfer', {from: user1, gas}, user1, '100');
            const user1Balance = await getERC20Balance(contract, user1);
            const sand777SenderBalance = await getERC20Balance(contract, Sand777Sender.options.address);
            assert.equal(sand777SenderBalance.toString(10), '900');
            assert.equal(user1Balance.toString(10), '999100');
        });
    });
  }
  
function failERC777Tests(title, resetContract) {
    tap.test(title, async (t) => {
        let contract;
        t.beforeEach(async () => {
            contract = await resetContract();
            const Sand777ContractInfo = rocketh.contractInfo('Sand777');
            contract = instantiateContract(Sand777ContractInfo.abi, contract.options.address);
        });

        t.test('sending from user1 to user2 should fail', async () => {
            await expectThrow(send(contract, user2, '1000', emptyBytes, {from: user1, gas}));
        });
        t.test('authorizeOperator should fails', async () => {
            await expectThrow(authorizeOperator(contract, operator, {from: user1, gas}));
        });
    });
}
  

module.exports = {
    runERC777Tests,
    failERC777Tests,
}
