const {
    encodeEventSignature,
} = require('./utils');

const TransferEvent = encodeEventSignature('Transfer(address,address,uint256)');
const ApprovalEvent = encodeEventSignature('Approval(address,address,uint256)');
const ApprovalForAllEvent = encodeEventSignature('ApprovalForAll(address,address,bool)');

function transfer(contract, to, tokenId, options) {
    return contract.methods.transfer(to, tokenId).send(options);
}

function getBalance(contract, account) {
    return contract.methods.balanceOf(account).call();
}

module.exports = {
    TransferEvent,
    ApprovalEvent,
    ApprovalForAllEvent,
    transfer,
    getBalance,
};
