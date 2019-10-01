const {
    encodeEventSignature,
} = require('./utils');

const TransferEvent = encodeEventSignature('Transfer(address,address,uint256)');
const ApprovalEvent = encodeEventSignature('Approval(address,address,uint256)');
const ApprovalForAllEvent = encodeEventSignature('ApprovalForAll(address,address,bool)');

function transferFrom(contract, from, to, tokenId, options) {
    return contract.methods.transferFrom(from, to, tokenId).send(options);
}

function balanceOf(contract, account) {
    return contract.methods.balanceOf(account).call();
}

module.exports = {
    TransferEvent,
    ApprovalEvent,
    ApprovalForAllEvent,
    transferFrom,
    balanceOf,
};
