const BN = require('bn.js');

const {
    encodeEventSignature,
} = require('./utils');


const TransferEvent = encodeEventSignature('Transfer(address,address,uint256)');
const ApproveEvent = encodeEventSignature('Approval(address,address,uint256)');

function transfer(contract, to, amount, options) {
  return contract.methods.transfer(to, amount).send(options);
}

function transferFrom(contract, from, to, amount, options) {
  return contract.methods.transferFrom(from, to, amount).send(options);
}

function burn(contract, amount, options) {
  return contract.methods.burn(amount).send(options);
}

function approve(contract, spender, value, options) {
  return contract.methods.approve(spender, value).send(options);
}

async function getERC20Balance(contract, account) {
  const balanceString = await contract.methods.balanceOf(account).call({from: account});
  return new BN(balanceString);
}

async function getERC20Allowance(contract, owner, spender) {
  const allowanceString = await contract.methods.allowance(owner, spender).call({from: owner});
  return new BN(allowanceString);
}

module.exports = {
    ApproveEvent,
    transfer,
    transferFrom,
    getERC20Balance,
    getERC20Allowance,
    burn,
    approve,
    TransferEvent,
}
