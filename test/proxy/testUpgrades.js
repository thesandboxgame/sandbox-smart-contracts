const t = require('tap');
const assert = require('assert');
const rocketh = require('rocketh');
const accounts = rocketh.accounts;

const {
    gas,
    expectThrow,
    toChecksumAddress,
    deployContract,
    tx,
    encodeCall,
    deployProxyContract
} = require('../utils');

const {
    transfer,
    getERC20Balance
} = require('../erc20');

const creator = toChecksumAddress(accounts[0]);
const sandOwner = creator;
const user1 = toChecksumAddress(accounts[1]);
const user2 = toChecksumAddress(accounts[2]);
const user3 = toChecksumAddress(accounts[3]);

async function deployProxiedSand20() {
  const sand20 = await deployContract(creator, 'Sand20', sandOwner, sandOwner);
  const initData = encodeCall(sand20, 'initSand', sandOwner, sandOwner);
  const result = await deployProxyContract(creator, sand20, initData);
  return {admin: result.admin, sand: result.proxy, proxyAsAdmin: result.proxyAsAdmin};
}

t.test('deploy proxxied Sand and transfer call from creator', async () => {
  const {sand} = await deployProxiedSand20();
  await transfer(sand, user1, '1000000', {from: creator, gas});
  const user1Balance = await getERC20Balance(sand, user1);
  assert.equal(user1Balance.toString(10), '1000000');
});

t.test('creator can change Admin via adminProxy', async () => {
  const {admin} = await deployProxiedSand20();
  await tx(admin, 'changeAdmin', {from: creator, gas}, user2);
});

t.test('other user cannot change Admin via adminProxy', async () => {
  const {admin} = await deployProxiedSand20();
  await expectThrow(tx(admin, 'changeAdmin', {from: user1, gas}, user2));
});

t.test('creator can change Admin via adminProxy and user can still transfer', async () => {
  const {admin, sand} = await deployProxiedSand20();
  await transfer(sand, user1, '1000000', {from: creator, gas});
  await tx(admin, 'changeAdmin', {from: creator, gas}, user2);
  await transfer(sand, user3, '1000', {from: user1, gas});
  const user3Balance = await getERC20Balance(sand, user3);
  assert.equal(user3Balance.toString(10), '1000');
});

t.test('creator can not upgrade after changing admin to another user', async () => {
  const {admin} = await deployProxiedSand20();
  await tx(admin, 'changeAdmin', {from: creator, gas}, user2);
  const sand777 = await deployContract(creator, 'Sand777', sandOwner);
  const initData = encodeCall(sand777, 'initSand', sandOwner);
  await expectThrow(tx(admin, 'upgradeToAndCall', {from: creator, gas}, sand777.options.address, initData));
});

t.test('creator cannot change admin after already doing so', async () => {
  const {admin} = await deployProxiedSand20();
  await tx(admin, 'changeAdmin', {from: creator, gas}, user2);
  await expectThrow(tx(admin, 'changeAdmin', {from: creator, gas}, user1));
});

t.test('creator can upgrade', async () => {
  const {admin} = await deployProxiedSand20();
  const sand777 = await deployContract(creator, 'Sand777', sandOwner);
  const initData = encodeCall(sand777, 'initSand', sandOwner);
  await tx(admin, 'upgradeToAndCall', {from: creator, gas}, sand777.options.address, initData);
});

t.test('new admin can upgrade directly', async () => {
  const {admin, proxyAsAdmin} = await deployProxiedSand20();
  await tx(admin, 'changeAdmin', {from: creator, gas}, user2);
  const sand777 = await deployContract(creator, 'Sand777', sandOwner);
  const initData = encodeCall(sand777, 'initSand', sandOwner);
  await tx(proxyAsAdmin, 'upgradeToAndCall', {from: user2, gas}, sand777.options.address, initData);
});

t.test('new admin cannot transfer ', async () => {
  const {admin, sand} = await deployProxiedSand20();
  await transfer(sand, user2, '1000000', {from: creator, gas});
  await tx(admin, 'changeAdmin', {from: creator, gas}, user2);
  await expectThrow(transfer(sand, user1, '100', {from: user2, gas}));
});

t.test('new admin owner can upgrade via admin', async () => {
  const {admin} = await deployProxiedSand20();
  await tx(admin, 'transferOwnership', {from: creator, gas}, user2);
  const sand777 = await deployContract(creator, 'Sand777', sandOwner);
  const initData = encodeCall(sand777, 'initSand', sandOwner);
  await tx(admin, 'upgradeToAndCall', {from: user2, gas}, sand777.options.address, initData);
});

t.test('new admin can change admin', async () => {
  const {admin, proxyAsAdmin} = await deployProxiedSand20();
  await tx(admin,'changeAdmin', {from: creator, gas}, user2);
  await tx(proxyAsAdmin,'changeAdmin', {from: user2, gas}, user1);
});
    
