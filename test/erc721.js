const {
    encodeEventSignature,
} = require('./utils');

const TransferEvent = encodeEventSignature('Transfer(address,address,uint256)');
const ApprovalEvent = encodeEventSignature('Approval(address,address,uint256)');
const ApprovalForAllEvent = encodeEventSignature('ApprovalForAll(address,address,bool)');

function transferFrom(contract, from, to, tokenId, options) {
    return contract.methods.transferFrom(from, to, tokenId).send(options);
}

function approve(contract, operator, id, options) {
    return contract.methods.approve(operator, id).send(options);
}

function approveFor(contract, sender, operator, id, options) {
    return contract.methods.approveFor(sender, operator, id).send(options);
}

function setApprovalForAll(contract, operator, approved, options) {
    return contract.methods.setApprovalForAll(operator, approved).send(options);
}

function setApprovalForAllFor(contract, sender, operator, approved, options) {
    return contract.methods.setApprovalForAllFor(sender, operator, approved).send(options);
}

function isApprovedForAll(contract, owner, operator) {
    return contract.methods.isApprovedForAll(owner, operator).call();
}

function getApproved(contract, id) {
    return contract.methods.getApproved(id).call();
}

function tokenURI(contract, id) {
    return contract.methods.tokenURI(id).call();
}

function name(contract) {
    return contract.methods.name().call();
}

function symbol(contract) {
    return contract.methods.name().symbol();
}

function balanceOf(contract, account) {
    return contract.methods.balanceOf(account).call();
}

function ownerOf(contract, tokenId) {
    return contract.methods.ownerOf(tokenId).call();
}

module.exports = {
    TransferEvent,
    ApprovalEvent,
    ApprovalForAllEvent,
    transferFrom,
    balanceOf,
    ownerOf,
    approve,
    approveFor,
    setApprovalForAll,
    setApprovalForAllFor,
    getApproved,
    isApprovedForAll,
    tokenURI,
    name,
    symbol,
};
